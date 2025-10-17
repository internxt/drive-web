import localStorageService from 'app/core/services/local-storage.service';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';
import { saveAs } from 'file-saver';

import { ChangePasswordWithLinkPayload } from '@internxt/sdk';
import { getKeys } from 'app/crypto/services/keys.service';
import { encryptText, encryptTextWithKey, passToHash } from 'app/crypto/services/utils';
import { validateMnemonic } from 'bip39';
import { encryptMessageWithPublicKey, hybridEncryptMessageWithPublicKey } from '../crypto/services/pgp.service';

/**
 * Interface representing the backup data structure
 * @interface BackupData
 * @property {string} mnemonic - The user's mnemonic phrase
 * @property {string} privateKey - The user's private key
 * @property {Object} keys - The user's encryption keys
 * @property {string} keys.ecc - The user's ECC private key
 * @property {string} keys.kyber - The user's Kyber private key
 */
export interface BackupData {
  mnemonic: string;
  privateKey: string;
  keys: {
    ecc: string;
    kyber: string;
  };
}

/**
 * Downloads the backup key of the user and shows a notification
 * @param {Function} translate - Translation function to localize notification messages
 * @returns {void}
 * @throws {Error} Implicitly throws if file saving fails
 */
export function handleExportBackupKey(translate) {
  const mnemonic = localStorageService.get('xMnemonic');
  const user = localStorageService.getUser();

  if (!mnemonic || !user) {
    notificationsService.show({
      text: translate('views.account.tabs.security.backupKey.error'),
      type: ToastType.Error,
    });
  } else {
    const backupData: BackupData = {
      mnemonic,
      privateKey: user.privateKey,
      keys: {
        ecc: user.keys?.ecc?.privateKey || user.privateKey,
        kyber: user.keys?.kyber?.privateKey || '',
      },
    };

    const backupContent = JSON.stringify(backupData, null, 2);
    saveAs(new Blob([backupContent], { type: 'text/plain' }), 'INTERNXT-BACKUP-KEY.txt');

    notificationsService.show({
      text: translate('views.account.tabs.security.backupKey.success'),
      type: ToastType.Success,
    });
  }
}

/**
 * Detects if a backup key file is in the old format (only mnemonic) or new format (has private keys)
 *
 * @param {string} backupKeyContent - The content of the backup key file to analyze
 * @returns {Object} Format detection result
 * @returns {('old'|'new')} return.type - The format type: 'old' for plain mnemonic, 'new' for JSON with keys
 * @returns {string} return.mnemonic - The extracted mnemonic phrase
 * @returns {BackupData} [return.backupData] - The full backup data (only for 'new' format)
 * @throws {Error} If the backup key format is invalid or cannot be parsed
 */
export const detectBackupKeyFormat = (
  backupKeyContent: string,
): { type: 'old' | 'new'; mnemonic: string; backupData?: BackupData } => {
  try {
    const parsedData = JSON.parse(backupKeyContent);
    if (
      parsedData &&
      parsedData.mnemonic &&
      parsedData.privateKey &&
      parsedData.keys &&
      parsedData.keys.ecc &&
      parsedData.keys.kyber
    ) {
      const backupData: BackupData = {
        mnemonic: parsedData.mnemonic,
        privateKey: parsedData.privateKey,
        keys: {
          ecc: parsedData.keys.ecc,
          kyber: parsedData.keys.kyber,
        },
      };
      return {
        type: 'new',
        mnemonic: parsedData.mnemonic,
        backupData,
      };
    }
  } catch {
    // Not JSON, might be an old format (just plain mnemonic)
  }
  const trimmedContent = backupKeyContent.trim();
  if (validateMnemonic(trimmedContent)) {
    return {
      type: 'old',
      mnemonic: trimmedContent,
    };
  }

  throw new Error('Invalid backup key format');
};

/**
 * Prepares the payload in the format required by the backend for account recovery
 * using the old backup format (mnemonic only)
 *
 * @param {Object} params - The parameters object
 * @param {string} params.mnemonic - The mnemonic phrase from the backup key
 * @param {string} params.password - The new password for the account
 * @param {string} params.token - The recovery token provided by the system
 * @returns {Promise<ChangePasswordWithLinkPayload>} Promise with the recovery payload formatted for the backend
 * @throws {Error} If the mnemonic is invalid or encryption fails
 */
export const prepareOldBackupRecoverPayloadForBackend = async ({
  mnemonic,
  password,
  token,
}: {
  mnemonic: string;
  password: string;
  token: string;
}): Promise<ChangePasswordWithLinkPayload> => {
  if (!validateMnemonic(mnemonic)) {
    throw new Error('Invalid mnemonic in backup key');
  }

  try {
    const hashObj = passToHash({ password });
    const encryptedPassword = encryptText(hashObj.hash);
    const encryptedSalt = encryptText(hashObj.salt);
    const encryptedMnemonic = encryptTextWithKey(mnemonic, password);

    const generatedKeys = await getKeys(password);
    const eccPublicKeyInBase64 = generatedKeys.publicKey;
    const kyberPublicKeyInBase64 = generatedKeys.kyber.publicKey;
    const eccEncryptedMnemonic = await encryptMessageWithPublicKey({
      message: mnemonic,
      publicKeyInBase64: generatedKeys.publicKey,
    });

    const base64EccEncryptedMnemonic = btoa(eccEncryptedMnemonic as string);

    const hybridEncryptedMnemonic = await hybridEncryptMessageWithPublicKey({
      message: mnemonic,
      publicKeyInBase64: eccPublicKeyInBase64,
      publicKyberKeyBase64: kyberPublicKeyInBase64 as string,
    });

    return {
      token,
      encryptedPassword: encryptedPassword,
      encryptedSalt: encryptedSalt,
      encryptedMnemonic: encryptedMnemonic,
      eccEncryptedMnemonic: base64EccEncryptedMnemonic,
      kyberEncryptedMnemonic: hybridEncryptedMnemonic,
      keys: {
        ecc: {
          public: generatedKeys.ecc?.publicKey,
          private: generatedKeys.ecc?.privateKeyEncrypted,
          revocationKey: generatedKeys.revocationCertificate,
        },
        kyber: {
          public: generatedKeys.kyber.publicKey as string,
          private: generatedKeys.kyber.privateKeyEncrypted as string,
        },
      },
    };
  } catch (error) {
    console.error('Error preparing recovery payload:', error);
    throw new Error('Error preparing recovery payload');
  }
};
