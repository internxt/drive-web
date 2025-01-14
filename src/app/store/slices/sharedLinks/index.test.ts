/**
 * @jest-environment jsdom
 */
import { describe, expect, it, vi, beforeEach, beforeAll } from 'vitest';
import { sharedThunks, ShareFileWithUserPayload } from './index';
const { shareItemWithUser } = sharedThunks;
import {
  generateNewKeys,
  hybridDecryptMessageWithPrivateKey,
  decryptMessageWithPrivateKey,
} from '../../../crypto/services/pgp.service';
import navigationService from 'app/core/services/navigation.service';
import { RootState } from '../..';
import { Buffer } from 'buffer';
import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import userService from '../../../auth/services/user.service';
import shareService from 'app/share/services/share.service';

describe('Encryption and Decryption', () => {
  beforeAll(() => {
    vi.mock('app/core/types', () => ({
      AppView: vi.fn(),
    }));
    vi.mock('app/core/services/navigation.service', () => ({
      default: { push: vi.fn() },
    }));
    vi.mock('app/share/services/share.service', () => ({
      default: {
        inviteUserToSharedFolder: vi.fn(),
        getSharedFolderInvitationsAsInvitedUser: vi.fn(),
        getSharingRoles: vi.fn(),
      },
    }));
    vi.mock('../../../auth/services/user.service', () => ({
      default: {
        getPublicKeyByEmail: vi.fn(),
        preCreateUser: vi.fn(),
      },
    }));

    vi.mock('../../../notifications/services/notifications.service', () => ({
      default: {
        show: vi.fn(),
      },
      ToastType: {
        Error: 'ERROR',
      },
    }));
    vi.mock('app/core/services/error.service', () => ({
      default: {
        castError: vi.fn().mockImplementation((e) => ({ message: e.message || 'Default error message' })),
        reportError: vi.fn(),
      },
    }));
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shareItemWithUser encrypts with kyber for an existing user', async () => {
    const keys = await generateNewKeys();
    const mockPayload: ShareFileWithUserPayload = {
      publicKey: keys.publicKeyArmored,
      publicKyberKey: keys.publicKyberKeyBase64,
      isNewUser: false,
      itemId: 'mock-itemId',
      itemType: 'file',
      notifyUser: false,
      notificationMessage: 'mock-notificationMessage',
      sharedWith: 'mock-sharedWith',
      encryptionAlgorithm: 'mock-encryptionAlgorithm',
      roleId: 'mock-roleId',
    };

    const mockUser: Partial<UserSettings> = {
      mnemonic:
        'truck arch rather sell tilt return warm nurse rack vacuum rubber tribe unfold scissors copper sock panel ozone harsh ahead danger soda legal state',
      keys: {
        ecc: {
          publicKey: keys.publicKeyArmored,
          privateKey: Buffer.from(keys.privateKeyArmored).toString('base64'),
        },
        kyber: {
          publicKey: keys.publicKyberKeyBase64,
          privateKey: keys.privateKyberKeyBase64,
        },
      },
    };

    const mockRootState: Partial<RootState> = {
      user: { user: mockUser as UserSettings, isInitializing: false, isAuthenticated: false, isInitialized: false },
    };

    const user = mockUser as UserSettings;
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

    vi.spyOn(userService, 'getPublicKeyByEmail').mockReturnValue(
      Promise.resolve({ publicKey: '', publicKyberKey: '' }),
    );
    vi.spyOn(userService, 'preCreateUser').mockReturnValue(
      Promise.resolve({
        publicKey: '',
        publicKyberKey: '',
        user: {
          uuid: '',
          email: '',
        },
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
        encryptionAlgorithm: mockPayload.encryptionAlgorithm,
        roleId: mockPayload.roleId,
        persistPreviousSharing: true,
      }),
    );
  });

  it('shareItemWithUser encrypts without kyber for an existing user', async () => {
    const keys = await generateNewKeys();
    const mockPayload: ShareFileWithUserPayload = {
      publicKey: keys.publicKeyArmored,
      publicKyberKey: '',
      isNewUser: false,
      itemId: 'mock-itemId',
      itemType: 'file',
      notifyUser: false,
      notificationMessage: 'mock-notificationMessage',
      sharedWith: 'mock-sharedWith',
      encryptionAlgorithm: 'mock-encryptionAlgorithm',
      roleId: 'mock-roleId',
    };

    const mockUser: Partial<UserSettings> = {
      mnemonic:
        'truck arch rather sell tilt return warm nurse rack vacuum rubber tribe unfold scissors copper sock panel ozone harsh ahead danger soda legal state',
      keys: {
        ecc: {
          publicKey: keys.publicKeyArmored,
          privateKey: Buffer.from(keys.privateKeyArmored).toString('base64'),
        },
        kyber: {
          publicKey: keys.publicKyberKeyBase64,
          privateKey: keys.privateKyberKeyBase64,
        },
      },
    };

    const mockRootState: Partial<RootState> = {
      user: { user: mockUser as UserSettings, isInitializing: false, isAuthenticated: false, isInitialized: false },
    };

    const user = mockUser as UserSettings;
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

    vi.spyOn(userService, 'getPublicKeyByEmail').mockReturnValue(
      Promise.resolve({ publicKey: '', publicKyberKey: '' }),
    );
    vi.spyOn(userService, 'preCreateUser').mockReturnValue(
      Promise.resolve({
        publicKey: '',
        publicKyberKey: '',
        user: {
          uuid: '',
          email: '',
        },
      }),
    );

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
        encryptionAlgorithm: mockPayload.encryptionAlgorithm,
        roleId: mockPayload.roleId,
        persistPreviousSharing: true,
      }),
    );
  });

  it('shareItemWithUser encrypts with kyber for an new user', async () => {
    const keys = await generateNewKeys();
    const mockPayload: ShareFileWithUserPayload = {
      publicKey: '',
      publicKyberKey: '',
      isNewUser: true,
      itemId: 'mock-itemId',
      itemType: 'file',
      notifyUser: false,
      notificationMessage: 'mock-notificationMessage',
      sharedWith: 'mock-sharedWith',
      encryptionAlgorithm: 'mock-encryptionAlgorithm',
      roleId: 'mock-roleId',
    };

    const mockUser: Partial<UserSettings> = {
      mnemonic:
        'truck arch rather sell tilt return warm nurse rack vacuum rubber tribe unfold scissors copper sock panel ozone harsh ahead danger soda legal state',
      keys: {
        ecc: {
          publicKey: keys.publicKeyArmored,
          privateKey: Buffer.from(keys.privateKeyArmored).toString('base64'),
        },
        kyber: {
          publicKey: keys.publicKyberKeyBase64,
          privateKey: keys.privateKyberKeyBase64,
        },
      },
    };

    const mockRootState: Partial<RootState> = {
      user: { user: mockUser as UserSettings, isInitializing: false, isAuthenticated: false, isInitialized: false },
    };

    const user = mockUser as UserSettings;
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

    vi.spyOn(userService, 'getPublicKeyByEmail').mockReturnValue(
      Promise.resolve({ publicKey: '', publicKyberKey: '' }),
    );
    vi.spyOn(userService, 'preCreateUser').mockReturnValue(
      Promise.resolve({
        publicKey: user.keys.ecc.publicKey,
        publicKyberKey: user.keys?.kyber.publicKey,
        user: {
          uuid: user.userId,
          email: user.email,
        },
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
        encryptionAlgorithm: mockPayload.encryptionAlgorithm,
        roleId: mockPayload.roleId,
        persistPreviousSharing: true,
      }),
    );
  });

  it('shareItemWithUser encrypts with kyber key obtained via getPublicKeyByEmail ', async () => {
    const keys = await generateNewKeys();
    const mockPayload: ShareFileWithUserPayload = {
      publicKey: '',
      publicKyberKey: '',
      isNewUser: false,
      itemId: 'mock-itemId',
      itemType: 'file',
      notifyUser: false,
      notificationMessage: 'mock-notificationMessage',
      sharedWith: 'mock-sharedWith',
      encryptionAlgorithm: 'mock-encryptionAlgorithm',
      roleId: 'mock-roleId',
    };

    const mockUser: Partial<UserSettings> = {
      mnemonic:
        'truck arch rather sell tilt return warm nurse rack vacuum rubber tribe unfold scissors copper sock panel ozone harsh ahead danger soda legal state',
      keys: {
        ecc: {
          publicKey: keys.publicKeyArmored,
          privateKey: Buffer.from(keys.privateKeyArmored).toString('base64'),
        },
        kyber: {
          publicKey: keys.publicKyberKeyBase64,
          privateKey: keys.privateKyberKeyBase64,
        },
      },
    };

    const mockRootState: Partial<RootState> = {
      user: { user: mockUser as UserSettings, isInitializing: false, isAuthenticated: false, isInitialized: false },
    };

    const user = mockUser as UserSettings;
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

    vi.spyOn(userService, 'getPublicKeyByEmail').mockReturnValue(
      Promise.resolve({ publicKey: user.keys.ecc.publicKey, publicKyberKey: user.keys?.kyber.publicKey }),
    );
    vi.spyOn(userService, 'preCreateUser').mockReturnValue(
      Promise.resolve({
        publicKey: '',
        publicKyberKey: '',
        user: {
          uuid: '',
          email: '',
        },
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
        encryptionAlgorithm: mockPayload.encryptionAlgorithm,
        roleId: mockPayload.roleId,
        persistPreviousSharing: true,
      }),
    );
  });
});
