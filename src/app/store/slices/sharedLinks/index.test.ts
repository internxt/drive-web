/**
 * @jest-environment jsdom
 */
import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import navigationService from 'services/navigation.service';
import shareService from 'app/share/services/share.service';
import { Buffer } from 'buffer';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { RootState } from '../..';
import userService from 'services/user.service';
import {
  decryptMessageWithPrivateKey,
  generateNewKeys,
  hybridDecryptMessageWithPrivateKey,
} from '../../../crypto/services/pgp.service';
import { HYBRID_ALGORITHM, sharedThunks, ShareFileWithUserPayload, STANDARD_ALGORITHM } from './index';
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
        castError: vi.fn().mockImplementation((e) => ({ message: e.message || 'Default error message' })),
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
});
