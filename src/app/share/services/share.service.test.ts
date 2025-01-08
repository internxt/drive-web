/**
 * @jest-environment jsdom
 */
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../core/services/local-storage.service', () => ({
  default: {
    getUser: vi.fn(),
  },
}));

import { generateNewKeys, encryptMessageWithPublicKey } from '../../crypto/services/pgp.service';
import localStorageService from '../../core/services/local-storage.service';
import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import { decryptMnemonic } from './share.service';

describe('Encryption and Decryption', () => {
  vi.mock('../../core/services/error.service', () => ({
    default: {
      castError: vi.fn(),
      reportError: vi.fn(),
    },
  }));

  vi.mock('../../notifications/services/notifications.service', () => ({
    show: vi.fn(),
  }));

  it('should decrypt mnemonic encrypted without kyber', async () => {
    const keys = await generateNewKeys();
    const publicKeyInBase64 = keys.publicKeyArmored;
    const message =
      'truck arch rather sell tilt return warm nurse rack vacuum rubber tribe unfold scissors copper sock panel ozone harsh ahead danger soda legal state';

    const encriptedMnemonic = await encryptMessageWithPublicKey({ message, publicKeyInBase64 });
    const encryptedMnemonicInBase64 = btoa(encriptedMnemonic as string);

    const mockUser: UserSettings = {
      uuid: 'mock-uuid',
      email: 'mock@test.com',
      privateKey: publicKeyInBase64,
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
      publicKey: keys.publicKyberKeyBase64,
      revocationKey: keys.revocationCertificate,
      keys: {
        ecc: {
          publicKey: publicKeyInBase64,
          privateKeyEncrypted: keys.privateKeyArmored,
        },
        kyber: {
          publicKey: keys.publicKyberKeyBase64,
          privateKeyEncrypted: keys.privateKyberKeyBase64,
        },
      },
      appSumoDetails: null,
      registerCompleted: false,
      hasReferralsProgram: false,
      createdAt: new Date(),
      avatar: null,
      emailVerified: false,
    };

    vi.spyOn(localStorageService, 'getUser').mockImplementation(() => mockUser);
    expect(localStorageService.getUser() as UserSettings).toEqual(mockUser);

    //const ownerMnemonic = await decryptMnemonic(encryptedMnemonicInBase64);
    //expect(localStorageService.getUser).toHaveBeenCalled();
    //expect(ownerMnemonic).toEqual(message);
  });
});
