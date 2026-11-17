/**
 * @jest-environment jsdom
 */
import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import shareService from 'app/share/services/share.service';
import { Buffer } from 'buffer';
import { beforeEach, describe, expect, it, test, vi } from 'vitest';
import { RootState } from '../..';
import userService from 'services/user.service';
import {
  decryptMessageWithPrivateKey,
  generateNewKeys,
  hybridDecryptMessageWithPrivateKey,
} from '../../../crypto/services/pgp.service';
import {
  HYBRID_ALGORITHM,
  removeUserFromSharedFolder,
  sharedThunks,
  ShareFileWithUserPayload,
  STANDARD_ALGORITHM,
  stopSharingItem,
} from './index';
import notificationsService from 'app/notifications/services/notifications.service';
const { shareItemWithUser } = sharedThunks;

vi.mock('services/navigation.service', () => ({
  default: { push: vi.fn() },
}));
vi.mock('app/share/services/share.service', () => ({
  default: {
    inviteUserToSharedFolder: vi.fn(),
    getSharedFolderInvitationsAsInvitedUser: vi.fn(),
    getSharingRoles: vi.fn(),
    stopSharingItem: vi.fn(),
    removeUserRole: vi.fn(),
  },
}));
vi.mock('services/user.service', () => ({
  default: {
    getPublicKeyWithPrecreation: vi.fn(),
  },
}));
vi.mock('utils', () => ({
  generateCaptchaToken: vi.fn().mockResolvedValue('mock-captcha-token'),
}));

vi.mock('services/referral.service', () => ({
  default: {
    trackShareCreated: vi.fn(),
  },
}));
vi.mock('services/error.service', () => ({
  default: {
    castError: vi
      .fn()
      .mockImplementation((e) => ({ message: e.message || 'Default error message', requestId: 'test-request-id' })),
    reportError: vi.fn(),
  },
}));

describe('Encryption and Decryption', () => {
  type Keys = Awaited<ReturnType<typeof generateNewKeys>>;

  const mockPayload: ShareFileWithUserPayload = {
    itemId: 'mock-itemId',
    itemType: 'file',
    notifyUser: false,
    notificationMessage: 'mock-notificationMessage',
    sharedWith: 'mock-sharedWith',
    encryptionAlgorithm: 'mock-ecc',
    roleId: 'mock-roleId',
  };

  const mockUser: Partial<UserSettings> = {
    mnemonic:
      'truck arch rather sell tilt return warm nurse rack vacuum rubber tribe unfold scissors copper sock panel ozone harsh ahead danger soda legal state',
  };

  const mockRootState: Partial<RootState> = {
    user: { user: mockUser as UserSettings, isInitializing: false, isAuthenticated: false, isInitialized: false },
  };

  const shareItem = () => shareItemWithUser(mockPayload)(vi.fn(), () => mockRootState as RootState, undefined);

  const toBase64 = (value: string) => Buffer.from(value).toString('base64');

  const decryptWithKyber = (encryptionKey: string, keys: Keys) =>
    hybridDecryptMessageWithPrivateKey({
      encryptedMessageInBase64: encryptionKey,
      privateKeyInBase64: toBase64(keys.privateKeyArmored),
      privateKyberKeyInBase64: keys.privateKyberKeyBase64,
    });

  const decryptHybridWithoutKyberKey = (encryptionKey: string, keys: Keys) =>
    hybridDecryptMessageWithPrivateKey({
      encryptedMessageInBase64: encryptionKey,
      privateKeyInBase64: toBase64(keys.privateKeyArmored),
      privateKyberKeyInBase64: '',
    });

  const decryptStandard = (encryptionKey: string, keys: Keys) =>
    decryptMessageWithPrivateKey({
      encryptedMessage: atob(encryptionKey),
      privateKeyInBase64: toBase64(keys.privateKeyArmored),
    });

  const shareCases: Array<{
    name: string;
    publicKyberKey: (keys: Keys) => string | undefined;
    decrypt: (encryptionKey: string, keys: Keys) => Promise<string>;
    algorithm: string;
  }> = [
    {
      name: 'shareItemWithUser encrypts with kyber for an existing user',
      publicKyberKey: (keys) => keys.publicKyberKeyBase64,
      decrypt: decryptWithKyber,
      algorithm: HYBRID_ALGORITHM,
    },
    {
      name: 'shareItemWithUser encrypts without kyber for an existing user',
      publicKyberKey: () => '',
      decrypt: decryptStandard,
      algorithm: STANDARD_ALGORITHM,
    },
    {
      name: 'shareItemWithUser encrypts with kyber for an new user',
      publicKyberKey: (keys) => keys.publicKyberKeyBase64,
      decrypt: decryptWithKyber,
      algorithm: HYBRID_ALGORITHM,
    },
    {
      name: 'shareItemWithUser encrypts without kyber for an new user',
      publicKyberKey: () => undefined,
      decrypt: decryptHybridWithoutKyberKey,
      algorithm: STANDARD_ALGORITHM,
    },
    {
      name: 'shareItemWithUser encrypts with kyber, keys obtained via getPublicKeyWithPrecreation ',
      publicKyberKey: (keys) => keys.publicKyberKeyBase64,
      decrypt: decryptWithKyber,
      algorithm: HYBRID_ALGORITHM,
    },
    {
      name: 'shareItemWithUser encrypts without kyber, keys obtained via getPublicKeyByEmail ',
      publicKyberKey: () => '',
      decrypt: decryptHybridWithoutKyberKey,
      algorithm: STANDARD_ALGORITHM,
    },
  ];

  beforeEach(() => {
    vi.resetModules();
  });

  it.each(shareCases)('$name', async ({ publicKyberKey, decrypt, algorithm }) => {
    const keys = await generateNewKeys();
    vi.spyOn(userService, 'getPublicKeyWithPrecreation').mockResolvedValue({
      publicKey: keys.publicKeyArmored,
      publicKyberKey: publicKyberKey(keys),
    });
    const inviteUserToSharedFolder = vi.spyOn(shareService, 'inviteUserToSharedFolder');

    await shareItem();

    const [inviteUserToSharedFolderInput] = inviteUserToSharedFolder.mock.calls[0];
    expect(inviteUserToSharedFolderInput.encryptionKey).toBeDefined();

    const { encryptionKey = '' } = inviteUserToSharedFolderInput;
    expect(await decrypt(encryptionKey, keys)).toEqual(mockUser.mnemonic);
    expect(inviteUserToSharedFolder).toHaveBeenCalledWith(
      expect.objectContaining({
        itemId: mockPayload.itemId,
        itemType: mockPayload.itemType,
        sharedWith: mockPayload.sharedWith,
        notifyUser: mockPayload.notifyUser,
        notificationMessage: mockPayload.notificationMessage,
        encryptionKey: encryptionKey,
        encryptionAlgorithm: algorithm,
        roleId: mockPayload.roleId,
        persistPreviousSharing: true,
      }),
    );
  });

  test('When an error occurs, then a notification is shown', async () => {
    const showNotificationSpy = vi.spyOn(notificationsService, 'show');
    vi.spyOn(shareService, 'inviteUserToSharedFolder').mockRejectedValue(new Error('mock-error'));

    await shareItem();

    expect(showNotificationSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        requestId: 'test-request-id',
      }),
    );
  });

  describe('Stop sharing item', () => {
    test('When an error occurs when stopping sharing, then a notification is shown', async () => {
      vi.spyOn(shareService, 'stopSharingItem').mockRejectedValue(new Error('Unexpected error'));
      const showNotificationSpy = vi.spyOn(notificationsService, 'show');

      const thunk = stopSharingItem({ itemId: 'mock-itemId', itemType: 'file', itemName: 'mock-itemName' });
      await thunk(vi.fn(), vi.fn(), undefined);

      expect(showNotificationSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          requestId: 'test-request-id',
        }),
      );
    });
  });

  describe('Removing user from folder', () => {
    test('When an error occurs when removing user from folder, then a notification is shown', async () => {
      vi.spyOn(shareService, 'removeUserRole').mockRejectedValue(new Error('Unexpected error'));
      const showNotificationSpy = vi.spyOn(notificationsService, 'show');

      const thunk = removeUserFromSharedFolder({
        itemId: 'mock-itemId',
        itemType: 'file',
        userEmail: 'mock-userEmail',
        userId: 'mock-userId',
      });
      await thunk(vi.fn(), vi.fn(), undefined);

      expect(showNotificationSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          requestId: 'test-request-id',
        }),
      );
    });
  });
});
