/**
 * @jest-environment jsdom
 */
import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import navigationService from 'services/navigation.service';
import shareService from 'app/share/services/share.service';
import { Buffer } from 'buffer';
import { beforeAll, beforeEach, describe, expect, it, test, vi } from 'vitest';
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

describe('Encryption and Decryption', () => {
  beforeAll(() => {
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

    vi.mock('services/error.service', () => ({
      default: {
        castError: vi
          .fn()
          .mockImplementation((e) => ({ message: e.message || 'Default error message', requestId: 'test-request-id' })),
        reportError: vi.fn(),
      },
    }));
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('shareItemWithUser encrypts with kyber for an existing user', async () => {
    const keys = await generateNewKeys();
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

    vi.spyOn(navigationService, 'push').mockImplementation(() => {});

    const mockShareService = {
      inviteUserToSharedFolder: vi.fn(),
      getSharedFolderInvitationsAsInvitedUser: vi.fn(),
      getSharingRoles: vi.fn(),
    };

    vi.spyOn(shareService, 'getSharedFolderInvitationsAsInvitedUser').mockImplementation(
      mockShareService.getSharedFolderInvitationsAsInvitedUser,
    );
    vi.spyOn(shareService, 'getSharingRoles').mockImplementation(mockShareService.getSharingRoles);
    vi.spyOn(shareService, 'inviteUserToSharedFolder').mockImplementation(mockShareService.inviteUserToSharedFolder);
    vi.spyOn(userService, 'getPublicKeyWithPrecreation').mockResolvedValue({
      publicKey: keys.publicKeyArmored,
      publicKyberKey: keys.publicKyberKeyBase64,
    });

    const getStateMock = vi.fn(() => mockRootState as RootState);
    const dispatchMock = vi.fn();

    const thunk = shareItemWithUser(mockPayload);
    await thunk(dispatchMock, getStateMock, undefined);

    const [inviteUserToSharedFolderInput] = mockShareService.inviteUserToSharedFolder.mock.calls[0];
    expect(inviteUserToSharedFolderInput.encryptionKey).toBeDefined();

    const { encryptionKey = '' } = inviteUserToSharedFolderInput;
    const decryptedMessage = await hybridDecryptMessageWithPrivateKey({
      encryptedMessageInBase64: encryptionKey,
      privateKeyInBase64: Buffer.from(keys.privateKeyArmored).toString('base64'),
      privateKyberKeyInBase64: keys.privateKyberKeyBase64,
    });

    expect(decryptedMessage).toEqual(mockUser.mnemonic);
    expect(mockShareService.inviteUserToSharedFolder).toHaveBeenCalledWith(
      expect.objectContaining({
        itemId: mockPayload.itemId,
        itemType: mockPayload.itemType,
        sharedWith: mockPayload.sharedWith,
        notifyUser: mockPayload.notifyUser,
        notificationMessage: mockPayload.notificationMessage,
        encryptionKey: encryptionKey,
        encryptionAlgorithm: HYBRID_ALGORITHM,
        roleId: mockPayload.roleId,
        persistPreviousSharing: true,
      }),
    );
  });

  it('shareItemWithUser encrypts without kyber for an existing user', async () => {
    const keys = await generateNewKeys();
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

    vi.spyOn(navigationService, 'push').mockImplementation(() => {});

    const mockShareService = {
      inviteUserToSharedFolder: vi.fn(),
      getSharedFolderInvitationsAsInvitedUser: vi.fn(),
      getSharingRoles: vi.fn(),
    };

    vi.spyOn(userService, 'getPublicKeyWithPrecreation').mockResolvedValue({
      publicKey: keys.publicKeyArmored,
      publicKyberKey: '',
    });

    vi.spyOn(shareService, 'getSharedFolderInvitationsAsInvitedUser').mockImplementation(
      mockShareService.getSharedFolderInvitationsAsInvitedUser,
    );
    vi.spyOn(shareService, 'getSharingRoles').mockImplementation(mockShareService.getSharingRoles);
    vi.spyOn(shareService, 'inviteUserToSharedFolder').mockImplementation(mockShareService.inviteUserToSharedFolder);

    const getStateMock = vi.fn(() => mockRootState as RootState);
    const dispatchMock = vi.fn();

    const thunk = shareItemWithUser(mockPayload);
    await thunk(dispatchMock, getStateMock, undefined);

    const [inviteUserToSharedFolderInput] = mockShareService.inviteUserToSharedFolder.mock.calls[0];
    expect(inviteUserToSharedFolderInput.encryptionKey).toBeDefined();

    const { encryptionKey = '' } = inviteUserToSharedFolderInput;
    const decryptedMessage = await decryptMessageWithPrivateKey({
      encryptedMessage: atob(encryptionKey),
      privateKeyInBase64: Buffer.from(keys.privateKeyArmored).toString('base64'),
    });

    expect(decryptedMessage).toEqual(mockUser.mnemonic);
    expect(mockShareService.inviteUserToSharedFolder).toHaveBeenCalledWith(
      expect.objectContaining({
        itemId: mockPayload.itemId,
        itemType: mockPayload.itemType,
        sharedWith: mockPayload.sharedWith,
        notifyUser: mockPayload.notifyUser,
        notificationMessage: mockPayload.notificationMessage,
        encryptionKey: encryptionKey,
        encryptionAlgorithm: STANDARD_ALGORITHM,
        roleId: mockPayload.roleId,
        persistPreviousSharing: true,
      }),
    );
  });

  it('shareItemWithUser encrypts with kyber for an new user', async () => {
    const keys = await generateNewKeys();
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

    vi.spyOn(navigationService, 'push').mockImplementation(() => {});

    const mockShareService = {
      inviteUserToSharedFolder: vi.fn(),
      getSharedFolderInvitationsAsInvitedUser: vi.fn(),
      getSharingRoles: vi.fn(),
    };

    vi.spyOn(shareService, 'getSharedFolderInvitationsAsInvitedUser').mockImplementation(
      mockShareService.getSharedFolderInvitationsAsInvitedUser,
    );
    vi.spyOn(shareService, 'getSharingRoles').mockImplementation(mockShareService.getSharingRoles);
    vi.spyOn(shareService, 'inviteUserToSharedFolder').mockImplementation(mockShareService.inviteUserToSharedFolder);

    vi.spyOn(userService, 'getPublicKeyWithPrecreation').mockReturnValue(
      Promise.resolve({
        publicKey: keys.publicKeyArmored,
        publicKyberKey: keys.publicKyberKeyBase64,
      }),
    );

    const getStateMock = vi.fn(() => mockRootState as RootState);
    const dispatchMock = vi.fn();

    const thunk = shareItemWithUser(mockPayload);
    await thunk(dispatchMock, getStateMock, undefined);

    const [inviteUserToSharedFolderInput] = mockShareService.inviteUserToSharedFolder.mock.calls[0];
    expect(inviteUserToSharedFolderInput.encryptionKey).toBeDefined();

    const { encryptionKey = '' } = inviteUserToSharedFolderInput;
    const decryptedMessage = await hybridDecryptMessageWithPrivateKey({
      encryptedMessageInBase64: encryptionKey,
      privateKeyInBase64: Buffer.from(keys.privateKeyArmored).toString('base64'),
      privateKyberKeyInBase64: keys.privateKyberKeyBase64,
    });

    expect(decryptedMessage).toEqual(mockUser.mnemonic);
    expect(mockShareService.inviteUserToSharedFolder).toHaveBeenCalledWith(
      expect.objectContaining({
        itemId: mockPayload.itemId,
        itemType: mockPayload.itemType,
        sharedWith: mockPayload.sharedWith,
        notifyUser: mockPayload.notifyUser,
        notificationMessage: mockPayload.notificationMessage,
        encryptionKey: encryptionKey,
        encryptionAlgorithm: HYBRID_ALGORITHM,
        roleId: mockPayload.roleId,
        persistPreviousSharing: true,
      }),
    );
  });

  it('shareItemWithUser encrypts without kyber for an new user', async () => {
    const keys = await generateNewKeys();
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

    vi.spyOn(navigationService, 'push').mockImplementation(() => {});

    const mockShareService = {
      inviteUserToSharedFolder: vi.fn(),
      getSharedFolderInvitationsAsInvitedUser: vi.fn(),
      getSharingRoles: vi.fn(),
    };

    vi.spyOn(shareService, 'getSharedFolderInvitationsAsInvitedUser').mockImplementation(
      mockShareService.getSharedFolderInvitationsAsInvitedUser,
    );
    vi.spyOn(shareService, 'getSharingRoles').mockImplementation(mockShareService.getSharingRoles);
    vi.spyOn(shareService, 'inviteUserToSharedFolder').mockImplementation(mockShareService.inviteUserToSharedFolder);

    vi.spyOn(userService, 'getPublicKeyWithPrecreation').mockResolvedValue({
      publicKey: keys.publicKeyArmored,
      publicKyberKey: undefined,
    });

    const getStateMock = vi.fn(() => mockRootState as RootState);
    const dispatchMock = vi.fn();

    const thunk = shareItemWithUser(mockPayload);
    await thunk(dispatchMock, getStateMock, undefined);

    const [inviteUserToSharedFolderInput] = mockShareService.inviteUserToSharedFolder.mock.calls[0];
    expect(inviteUserToSharedFolderInput.encryptionKey).toBeDefined();

    const { encryptionKey = '' } = inviteUserToSharedFolderInput;
    const decryptedMessage = await hybridDecryptMessageWithPrivateKey({
      encryptedMessageInBase64: encryptionKey,
      privateKeyInBase64: Buffer.from(keys.privateKeyArmored).toString('base64'),
      privateKyberKeyInBase64: '',
    });

    expect(decryptedMessage).toEqual(mockUser.mnemonic);
    expect(mockShareService.inviteUserToSharedFolder).toHaveBeenCalledWith(
      expect.objectContaining({
        itemId: mockPayload.itemId,
        itemType: mockPayload.itemType,
        sharedWith: mockPayload.sharedWith,
        notifyUser: mockPayload.notifyUser,
        notificationMessage: mockPayload.notificationMessage,
        encryptionKey: encryptionKey,
        encryptionAlgorithm: STANDARD_ALGORITHM,
        roleId: mockPayload.roleId,
        persistPreviousSharing: true,
      }),
    );
  });

  it('shareItemWithUser encrypts with kyber, keys obtained via getPublicKeyWithPrecreation ', async () => {
    const keys = await generateNewKeys();
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

    vi.spyOn(navigationService, 'push').mockImplementation(() => {});

    const mockShareService = {
      inviteUserToSharedFolder: vi.fn(),
      getSharedFolderInvitationsAsInvitedUser: vi.fn(),
      getSharingRoles: vi.fn(),
    };

    vi.spyOn(shareService, 'getSharedFolderInvitationsAsInvitedUser').mockImplementation(
      mockShareService.getSharedFolderInvitationsAsInvitedUser,
    );
    vi.spyOn(shareService, 'getSharingRoles').mockImplementation(mockShareService.getSharingRoles);
    vi.spyOn(shareService, 'inviteUserToSharedFolder').mockImplementation(mockShareService.inviteUserToSharedFolder);

    vi.spyOn(userService, 'getPublicKeyWithPrecreation').mockResolvedValue({
      publicKey: keys.publicKeyArmored,
      publicKyberKey: keys.publicKyberKeyBase64,
    });

    const getStateMock = vi.fn(() => mockRootState as RootState);
    const dispatchMock = vi.fn();

    const thunk = shareItemWithUser(mockPayload);
    await thunk(dispatchMock, getStateMock, undefined);

    const [inviteUserToSharedFolderInput] = mockShareService.inviteUserToSharedFolder.mock.calls[0];
    expect(inviteUserToSharedFolderInput.encryptionKey).toBeDefined();

    const { encryptionKey = '' } = inviteUserToSharedFolderInput;
    const decryptedMessage = await hybridDecryptMessageWithPrivateKey({
      encryptedMessageInBase64: encryptionKey,
      privateKeyInBase64: Buffer.from(keys.privateKeyArmored).toString('base64'),
      privateKyberKeyInBase64: keys.privateKyberKeyBase64,
    });

    expect(decryptedMessage).toEqual(mockUser.mnemonic);
    expect(mockShareService.inviteUserToSharedFolder).toHaveBeenCalledWith(
      expect.objectContaining({
        itemId: mockPayload.itemId,
        itemType: mockPayload.itemType,
        sharedWith: mockPayload.sharedWith,
        notifyUser: mockPayload.notifyUser,
        notificationMessage: mockPayload.notificationMessage,
        encryptionKey: encryptionKey,
        encryptionAlgorithm: HYBRID_ALGORITHM,
        roleId: mockPayload.roleId,
        persistPreviousSharing: true,
      }),
    );
  });

  it('shareItemWithUser encrypts without kyber, keys obtained via getPublicKeyByEmail ', async () => {
    const keys = await generateNewKeys();
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

    vi.spyOn(navigationService, 'push').mockImplementation(() => {});

    const mockShareService = {
      inviteUserToSharedFolder: vi.fn(),
      getSharedFolderInvitationsAsInvitedUser: vi.fn(),
      getSharingRoles: vi.fn(),
    };

    vi.spyOn(shareService, 'getSharedFolderInvitationsAsInvitedUser').mockImplementation(
      mockShareService.getSharedFolderInvitationsAsInvitedUser,
    );
    vi.spyOn(shareService, 'getSharingRoles').mockImplementation(mockShareService.getSharingRoles);
    vi.spyOn(shareService, 'inviteUserToSharedFolder').mockImplementation(mockShareService.inviteUserToSharedFolder);

    vi.spyOn(userService, 'getPublicKeyWithPrecreation').mockResolvedValue({
      publicKey: keys.publicKeyArmored,
      publicKyberKey: '',
    });
    const getStateMock = vi.fn(() => mockRootState as RootState);
    const dispatchMock = vi.fn();

    const thunk = shareItemWithUser(mockPayload);
    await thunk(dispatchMock, getStateMock, undefined);

    const [inviteUserToSharedFolderInput] = mockShareService.inviteUserToSharedFolder.mock.calls[0];
    expect(inviteUserToSharedFolderInput.encryptionKey).toBeDefined();

    const { encryptionKey = '' } = inviteUserToSharedFolderInput;
    const decryptedMessage = await hybridDecryptMessageWithPrivateKey({
      encryptedMessageInBase64: encryptionKey,
      privateKeyInBase64: Buffer.from(keys.privateKeyArmored).toString('base64'),
      privateKyberKeyInBase64: '',
    });

    expect(decryptedMessage).toEqual(mockUser.mnemonic);
    expect(mockShareService.inviteUserToSharedFolder).toHaveBeenCalledWith(
      expect.objectContaining({
        itemId: mockPayload.itemId,
        itemType: mockPayload.itemType,
        sharedWith: mockPayload.sharedWith,
        notifyUser: mockPayload.notifyUser,
        notificationMessage: mockPayload.notificationMessage,
        encryptionKey: encryptionKey,
        encryptionAlgorithm: STANDARD_ALGORITHM,
        roleId: mockPayload.roleId,
        persistPreviousSharing: true,
      }),
    );
  });

  test('When an error occurs, then a notification is shown', async () => {
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

    const showNotificationSpy = vi.spyOn(notificationsService, 'show');

    vi.spyOn(shareService, 'inviteUserToSharedFolder').mockRejectedValue(new Error('mock-error'));

    const getStateMock = vi.fn(() => mockRootState as RootState);
    const dispatchMock = vi.fn();

    const thunk = shareItemWithUser(mockPayload);
    await thunk(dispatchMock, getStateMock, undefined);

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
