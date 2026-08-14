import { describe, expect, vi, Mock, beforeEach, test } from 'vitest';
import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';

import { generateNewKeys, encryptMessageWithPublicKey } from '../../crypto/services/pgp.service';
import encryptedStorageService from 'services/encrypted-storage.service';
import { decryptMnemonic, encryptMnemonic } from './share.crypto';

vi.mock('services/error.service', () => ({
  default: {
    castError: vi.fn().mockImplementation((e) => ({
      message: typeof e === 'string' ? e : e.message || 'Default error message',
      requestId: 'test-request-id',
    })),
    reportError: vi.fn(),
  },
}));

vi.mock('services/encrypted-storage.service', () => ({
  default: {
    getUser: vi.fn(),
  },
}));

async function getMockUser(
  keys: {
    privateKeyArmored: string;
    publicKeyArmored: string;
    publicKyberKeyBase64: string;
    privateKyberKeyBase64: string;
  },
  encryptedMnemonicInBase64: string,
): Promise<UserSettings> {
  const mockUser: UserSettings = {
    uuid: 'mock-uuid',
    email: 'mock@test.com',
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

describe('should decrypt mnemonics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  test('should decrypt mnemonic encrypted without kyber', async () => {
    const mnemonic =
      'truck arch rather sell tilt return warm nurse rack vacuum rubber tribe unfold scissors copper sock panel ozone harsh ahead danger soda legal state';
    const keys = await generateNewKeys();
    const encriptedMnemonic = await encryptMessageWithPublicKey({
      message: mnemonic,
      publicKeyInBase64: keys.publicKeyArmored,
    });
    const encryptedMnemonicInBase64 = btoa(encriptedMnemonic as string);

    const mockUser = await getMockUser(keys, encryptedMnemonicInBase64);

    (encryptedStorageService.getUser as Mock).mockReturnValue(mockUser);
    expect(encryptedStorageService.getUser() as UserSettings).toEqual(mockUser);

    const ownerMnemonic = await decryptMnemonic(mockUser.mnemonic);
    expect(encryptedStorageService.getUser).toHaveBeenCalled();
    expect(ownerMnemonic).toEqual(mnemonic);
  });

  test('should decrypt mnemonic encrypted with kyber', async () => {
    const mnemonic =
      'until bonus summer risk chunk oyster census ability frown win pull steel measure employ rigid improve riot remind system earn inch broken chalk clip';
    const keys = await generateNewKeys();
    const encriptedMnemonic = await encryptMnemonic(mnemonic, keys.publicKeyArmored, keys.publicKyberKeyBase64);

    const mockUser = await getMockUser(keys, encriptedMnemonic);

    (encryptedStorageService.getUser as Mock).mockReturnValue(mockUser);
    expect(encryptedStorageService.getUser() as UserSettings).toEqual(mockUser);

    const ownerMnemonic = await decryptMnemonic(mockUser.mnemonic);
    expect(encryptedStorageService.getUser).toHaveBeenCalled();
    expect(ownerMnemonic).toEqual(mnemonic);
  });
});
