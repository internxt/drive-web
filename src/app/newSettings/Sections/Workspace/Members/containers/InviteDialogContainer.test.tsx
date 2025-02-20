/**
 * @jest-environment jsdom
 */
import { describe, expect, it, vi, beforeEach, beforeAll } from 'vitest';
import { processInvitation } from './InviteDialogContainer';
import {
  generateNewKeys,
  hybridDecryptMessageWithPrivateKey,
  decryptMessageWithPrivateKey,
} from '../../../../../crypto/services/pgp.service';
import navigationService from '../../../../../core/services/navigation.service';
import workspacesService from '../../../../../core/services/workspace.service';
import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import userService from '../../../../../auth/services/user.service';
import { Buffer } from 'buffer';

describe('Encryption and Decryption', () => {
  beforeAll(() => {
    vi.mock('../../../../../core/services/navigation.service', () => ({
      default: { push: vi.fn() },
    }));
    vi.mock('../../../../../core/services/workspace.service', () => ({
      default: {
        inviteUserToTeam: vi.fn(),
      },
    }));
    vi.mock('../../../../../auth/services/user.service', () => ({
      default: {
        getPublicKeyByEmail: vi.fn(),
        preCreateUser: vi.fn(),
      },
    }));

    vi.mock('../../../../../store', () => ({
      RootState: vi.fn(),
    }));
    vi.mock('../InviteDialog', () => ({
      default: {
        UserInviteDialog: vi.fn(),
      },
    }));
    vi.mock('react-redux', () => ({
      useSelector: vi.fn(),
    }));
    vi.mock('../../../../../core/types', () => ({
      AppView: vi.fn(),
    }));

    vi.mock('../../../../../notifications/services/notifications.service', () => ({
      default: {
        show: vi.fn(),
      },
      ToastType: {
        Error: 'ERROR',
      },
    }));
    vi.mock('../../../../../core/services/error.service', () => ({
      default: {
        castError: vi.fn().mockImplementation((e) => ({ message: e.message || 'Default error message' })),
        reportError: vi.fn(),
      },
    }));
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  async function getMockUser() {
    const keys = await generateNewKeys();
    const mockUser: Partial<UserSettings> = {
      uuid: 'mock-uuid',
      email: 'mockemail@test.com',
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
    return {
      user: mockUser as UserSettings,
      privateKey: keys.privateKeyArmored,
      privateKyberKey: keys.privateKyberKeyBase64,
    };
  }

  async function getMockOldUser() {
    const keys = await generateNewKeys();
    const mockUser: Partial<UserSettings> = {
      uuid: 'mock-uuid',
      email: 'mockemail@test.com',
      mnemonic:
        'truck arch rather sell tilt return warm nurse rack vacuum rubber tribe unfold scissors copper sock panel ozone harsh ahead danger soda legal state',
      publicKey: keys.publicKeyArmored,
      privateKey: Buffer.from(keys.privateKeyArmored).toString('base64'),
    };
    return {
      user: mockUser as UserSettings,
      privateKey: keys.privateKeyArmored,
    };
  }

  it('should process invitation and encrypt mnemonic with kyber for existing user', async () => {
    const { user, privateKey, privateKyberKey } = await getMockUser();
    const mockEmail = user.email;
    const mockWorkspaceId = 'mock-workspaceId';
    const mockMessageText = 'mock-messageText';

    const mockWorkspacesService = {
      inviteUserToTeam: vi.fn(),
    };

    vi.spyOn(navigationService, 'push').mockImplementation(() => {});
    vi.spyOn(workspacesService, 'inviteUserToTeam').mockImplementation(mockWorkspacesService.inviteUserToTeam);
    vi.spyOn(userService, 'getPublicKeyByEmail').mockReturnValue(
      Promise.resolve({ publicKey: user.keys.ecc.publicKey, publicKyberKey: user.keys?.kyber.publicKey }),
    );

    await processInvitation(user, mockEmail, mockWorkspaceId, mockMessageText);

    const [workspacesServiceInfo] = mockWorkspacesService.inviteUserToTeam.mock.calls[0];
    expect(workspacesServiceInfo.encryptedMnemonicInBase64).toBeDefined();

    const { encryptedMnemonicInBase64 } = workspacesServiceInfo;
    const decryptedMessage = await hybridDecryptMessageWithPrivateKey({
      encryptedMessageInBase64: encryptedMnemonicInBase64,
      privateKeyInBase64: Buffer.from(privateKey).toString('base64'),
      privateKyberKeyInBase64: privateKyberKey,
    });

    expect(decryptedMessage).toEqual(user.mnemonic);
  });

  it('should process invitation and encrypt mnemonic without kyber for existing user', async () => {
    const { user, privateKey } = await getMockOldUser();
    const mockEmail = user.email;
    const mockWorkspaceId = 'mock-workspaceId';
    const mockMessageText = 'mock-messageText';

    const mockWorkspacesService = {
      inviteUserToTeam: vi.fn(),
    };

    vi.spyOn(navigationService, 'push').mockImplementation(() => {});
    vi.spyOn(workspacesService, 'inviteUserToTeam').mockImplementation(mockWorkspacesService.inviteUserToTeam);
    vi.spyOn(userService, 'getPublicKeyByEmail').mockReturnValue(Promise.resolve({ publicKey: user.publicKey }));

    await processInvitation(user, mockEmail, mockWorkspaceId, mockMessageText);

    const [workspacesServiceInfo] = mockWorkspacesService.inviteUserToTeam.mock.calls[0];
    expect(workspacesServiceInfo.encryptedMnemonicInBase64).toBeDefined();

    const { encryptedMnemonicInBase64 } = workspacesServiceInfo;
    const decryptedMessage = await decryptMessageWithPrivateKey({
      encryptedMessage: atob(encryptedMnemonicInBase64),
      privateKeyInBase64: Buffer.from(privateKey).toString('base64'),
    });

    expect(decryptedMessage).toEqual(user.mnemonic);
  });

  it('should process invitation and encrypt mnemonic with kyber for new user', async () => {
    const { user, privateKey, privateKyberKey } = await getMockUser();
    const mockEmail = user.email;
    const mockWorkspaceId = 'mock-workspaceId';
    const mockMessageText = 'mock-messageText';

    const mockWorkspacesService = {
      inviteUserToTeam: vi.fn(),
    };

    vi.spyOn(navigationService, 'push').mockImplementation(() => {});
    vi.spyOn(workspacesService, 'inviteUserToTeam').mockImplementation(mockWorkspacesService.inviteUserToTeam);
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

    await processInvitation(user, mockEmail, mockWorkspaceId, mockMessageText);

    const [workspacesServiceInfo] = mockWorkspacesService.inviteUserToTeam.mock.calls[0];
    expect(workspacesServiceInfo.encryptedMnemonicInBase64).toBeDefined();

    const { encryptedMnemonicInBase64 } = workspacesServiceInfo;
    const decryptedMessage = await hybridDecryptMessageWithPrivateKey({
      encryptedMessageInBase64: encryptedMnemonicInBase64,
      privateKeyInBase64: Buffer.from(privateKey).toString('base64'),
      privateKyberKeyInBase64: privateKyberKey,
    });

    expect(decryptedMessage).toEqual(user.mnemonic);
  });

  it('should process invitation and encrypt mnemonic for new user without Kyber', async () => {
    const { user, privateKey } = await getMockOldUser();
    const mockEmail = user.email;
    const mockWorkspaceId = 'mock-workspaceId';
    const mockMessageText = 'mock-messageText';

    const mockWorkspacesService = {
      inviteUserToTeam: vi.fn(),
    };

    vi.spyOn(navigationService, 'push').mockImplementation(() => {});
    vi.spyOn(workspacesService, 'inviteUserToTeam').mockImplementation(mockWorkspacesService.inviteUserToTeam);
    vi.spyOn(userService, 'getPublicKeyByEmail').mockReturnValue(Promise.resolve({ publicKey: '' }));
    vi.spyOn(userService, 'preCreateUser').mockReturnValue(
      Promise.resolve({
        publicKey: user.publicKey,
        user: {
          uuid: user.userId,
          email: user.email,
        },
      }),
    );

    await processInvitation(user, mockEmail, mockWorkspaceId, mockMessageText);

    const [workspacesServiceInfo] = mockWorkspacesService.inviteUserToTeam.mock.calls[0];
    expect(workspacesServiceInfo.encryptedMnemonicInBase64).toBeDefined();

    const { encryptedMnemonicInBase64 } = workspacesServiceInfo;
    const decryptedMessage = await hybridDecryptMessageWithPrivateKey({
      encryptedMessageInBase64: encryptedMnemonicInBase64,
      privateKeyInBase64: Buffer.from(privateKey).toString('base64'),
      privateKyberKeyInBase64: '',
    });

    expect(decryptedMessage).toEqual(user.mnemonic);
  });
});
