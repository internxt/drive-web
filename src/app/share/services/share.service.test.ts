/**
 * @jest-environment jsdom
 */
import { describe, expect, it, vi, Mock, beforeEach, beforeAll } from 'vitest';
import localStorageService from '../../core/services/local-storage.service';
import { Buffer } from 'buffer';
import {
  generateNewKeys,
  encryptMessageWithPublicKey,
  hybridEncryptMessageWithPublicKey,
} from '../../crypto/services/pgp.service';

import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import { decryptMnemonic } from './share.service';

describe('Encryption and Decryption', () => {
  beforeAll(() => {
    vi.mock('app/drive/services/folder.service', () => ({
      default: {
        downloadSharedFolderAsZip: vi.fn(),
      },
    }));
    vi.mock('../../core/factory/sdk', () => ({ SdkFactory: vi.fn() }));
    vi.mock('../../core/services/error.service', () => ({
      default: {
        castError: vi.fn().mockImplementation((e) => ({ message: e.message || 'Default error message' })),
        reportError: vi.fn(),
      },
    }));
    vi.mock('../../core/services/local-storage.service', () => ({
      default: {
        getUser: vi.fn(),
      },
    }));
    vi.mock('../../core/services/workspace.service', () => ({
      default: {
        getAllWorkspaceTeamSharedFolderFolders: vi.fn(),
        getAllWorkspaceTeamSharedFolderFiles: vi.fn(),
      },
    }));
    vi.mock('../../notifications/services/notifications.service', () => ({
      default: {
        show: vi.fn(),
      },
      ToastType: {
        Error: 'ERROR',
      },
    }));
    vi.mock('../../store/slices/storage/storage.thunks/downloadItemsThunk', () => ({
      downloadItemsAsZipThunk: vi.fn(),
      downloadItemsThunk: vi.fn(),
    }));
    vi.mock('./DomainManager', () => ({ domainManager: vi.fn() }));
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  async function getMockUser(
    keys: {
      privateKeyArmored: string;
      publicKeyArmored: string;
      revocationCertificate: string;
      publicKyberKeyBase64: string;
      privateKyberKeyBase64: string;
    },
    encryptedMnemonicInBase64: string,
  ): Promise<UserSettings> {
    const mockUser: UserSettings = {
      uuid: 'mock-uuid',
      email: 'mock@test.com',
      privateKey: Buffer.from(keys.privateKeyArmored).toString('base64'),
      mnemonic: encryptedMnemonicInBase64,
      userId: 'mock-user-id',
      name: 'mock-name',
      lastname: 'mock-lastname',
      username: 'mock-username',
      bridgeUser: 'mock-bridgeUser',
      bucket: 'mock-bucket',
      backupsBucket: null,
      root_folder_id: 0,
      rootFolderId: 'mock-rootFolderId',
      rootFolderUuid: undefined,
      sharedWorkspace: false,
      credit: 0,
      publicKey: keys.publicKeyArmored,
      revocationKey: keys.revocationCertificate,
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
      appSumoDetails: null,
      registerCompleted: false,
      hasReferralsProgram: false,
      createdAt: new Date(),
      avatar: null,
      emailVerified: false,
    };
    return mockUser;
  }
  it('should decrypt mnemonic encrypted without kyber', async () => {
    const mnemonic =
      'truck arch rather sell tilt return warm nurse rack vacuum rubber tribe unfold scissors copper sock panel ozone harsh ahead danger soda legal state';
    const keys = await generateNewKeys();
    const encriptedMnemonic = await encryptMessageWithPublicKey({
      message: mnemonic,
      publicKeyInBase64: keys.publicKeyArmored,
    });
    const encryptedMnemonicInBase64 = btoa(encriptedMnemonic as string);

    const mockUser = await getMockUser(keys, encryptedMnemonicInBase64);

    (localStorageService.getUser as Mock).mockReturnValue(mockUser);
    expect(localStorageService.getUser() as UserSettings).toEqual(mockUser);

    const ownerMnemonic = await decryptMnemonic(mockUser.mnemonic);
    expect(localStorageService.getUser).toHaveBeenCalled();
    expect(ownerMnemonic).toEqual(mnemonic);
  });

  it('should decrypt mnemonic encrypted with kyber', async () => {
    const mnemonic =
      'until bonus summer risk chunk oyster census ability frown win pull steel measure employ rigid improve riot remind system earn inch broken chalk clip';
    const keys = await generateNewKeys();
    const encriptedMnemonic = await hybridEncryptMessageWithPublicKey({
      message: mnemonic,
      publicKeyInBase64: keys.publicKeyArmored,
      publicKyberKeyBase64: keys.publicKyberKeyBase64,
    });

    const mockUser = await getMockUser(keys, encriptedMnemonic);

    (localStorageService.getUser as Mock).mockReturnValue(mockUser);
    expect(localStorageService.getUser() as UserSettings).toEqual(mockUser);

    const ownerMnemonic = await decryptMnemonic(mockUser.mnemonic);
    expect(localStorageService.getUser).toHaveBeenCalled();
    expect(ownerMnemonic).toEqual(mnemonic);
  });

  it('should decrypt mnemonic encrypted without key field', async () => {
    const mnemonic =
      'truck arch rather sell tilt return warm nurse rack vacuum rubber tribe unfold scissors copper sock panel ozone harsh ahead danger soda legal state';
    const keys = await generateNewKeys();
    const encriptedMnemonic = await encryptMessageWithPublicKey({
      message: mnemonic,
      publicKeyInBase64: keys.publicKeyArmored,
    });
    const encryptedMnemonicInBase64 = btoa(encriptedMnemonic as string);

    const mockOldUser: Partial<UserSettings> = {
      uuid: 'mock-uuid',
      email: 'mock@test.com',
      privateKey: Buffer.from(keys.privateKeyArmored).toString('base64'),
      mnemonic: encryptedMnemonicInBase64,
      userId: 'mock-user-id',
      name: 'mock-name',
      lastname: 'mock-lastname',
      username: 'mock-username',
      bridgeUser: 'mock-bridgeUser',
      bucket: 'mock-bucket',
      backupsBucket: null,
      root_folder_id: 0,
      rootFolderId: 'mock-rootFolderId',
      rootFolderUuid: undefined,
      sharedWorkspace: false,
      credit: 0,
      publicKey: keys.publicKeyArmored,
      revocationKey: keys.revocationCertificate,
      appSumoDetails: null,
      registerCompleted: false,
      hasReferralsProgram: false,
      createdAt: new Date(),
      avatar: null,
      emailVerified: false,
    };

    const mockUser = mockOldUser as UserSettings;

    (localStorageService.getUser as Mock).mockReturnValue(mockUser);
    expect(localStorageService.getUser() as UserSettings).toEqual(mockUser);

    const ownerMnemonic = await decryptMnemonic(mockUser.mnemonic);
    expect(localStorageService.getUser).toHaveBeenCalled();
    expect(ownerMnemonic).toEqual(mnemonic);
  });
});
