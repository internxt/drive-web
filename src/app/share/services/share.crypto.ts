import {
  hybridDecryptMessageWithPrivateKey,
  hybridEncryptMessageWithPublicKey,
  encryptBucketKeyHybrid,
  decryptBucketKeyHybrid,
  isBucketKeyCiphertext,
} from '../../crypto/services/pgp.service';
import encryptedStorageService from 'services/encrypted-storage.service';
import notificationsService, { ToastType } from '../../notifications/services/notifications.service';
import { t } from 'i18next';
import errorService from 'services/error.service';
import { generateFileBucketKey } from 'app/network/crypto';
import { FileKey } from 'app/network/types/helper-types';

export const decryptMnemonic = async (encryptionKey: string): Promise<string | undefined> => {
  const user = await encryptedStorageService.getUser();
  if (user) {
    let decryptedKey;
    try {
      const privateKeyInBase64 = user.keys.ecc.privateKey;
      const privateKyberKeyInBase64 = user.keys.kyber.privateKey;
      decryptedKey = await hybridDecryptMessageWithPrivateKey({
        encryptedMessageInBase64: encryptionKey,
        privateKeyInBase64,
        privateKyberKeyInBase64,
      });
    } catch (err) {
      decryptedKey = user.mnemonic;
    }
    return decryptedKey;
  } else {
    handleError('User Not Found', 'error.decryptMnemonic');
  }
};

export const encryptMnemonic = async (
  mnemonic: string,
  publicKeyInBase64: string,
  publicKyberKeyBase64?: string,
): Promise<string> => {
  return hybridEncryptMessageWithPublicKey({
    message: mnemonic,
    publicKeyInBase64,
    publicKyberKeyBase64,
  });
};

export const encryptBucketKey = async (
  mnemonic: string,
  bucketId: string,
  publicKeyInBase64: string,
  publicKyberKeyBase64: string,
): Promise<string> => {
  const bucketKey = await generateFileBucketKey(mnemonic, bucketId);
  return encryptBucketKeyHybrid({
    bucketKey,
    publicKeyInBase64,
    publicKyberKeyBase64,
  });
};

const handleError = (err: unknown, keyLabel: string) => {
  const error = errorService.castError(err);
  errorService.reportError(error);

  notificationsService.show({
    text: t(keyLabel, { message: error.message }),
    type: ToastType.Error,
  });
};

export const decryptBucketKey = async (encryptionKey: string): Promise<Uint8Array | undefined> => {
  const user = await encryptedStorageService.getUser();
  if (user) {
    let decryptedKey;
    try {
      const privateKeyInBase64 = user.keys.ecc.privateKey;
      const privateKyberKeyInBase64 = user.keys.kyber.privateKey;
      decryptedKey = await decryptBucketKeyHybrid({
        encryptedMessageInBase64: encryptionKey,
        privateKeyInBase64,
        privateKyberKeyInBase64,
      });
    } catch (err) {
      handleError(err, 'error.decryptBucketKey');
      decryptedKey = undefined;
    }
    return decryptedKey;
  } else {
    handleError('User Not Found', 'error.decryptBucketKey');
  }
};

export const decryptSharingKey = async (encryptionKey: string): Promise<FileKey | undefined> => {
  if (isBucketKeyCiphertext(encryptionKey)) {
    const bucketKey = await decryptBucketKey(encryptionKey);
    return bucketKey ? { bucketKey: Buffer.from(bucketKey) } : undefined;
  }

  const mnemonic = await decryptMnemonic(encryptionKey);
  return mnemonic ? { mnemonic } : undefined;
};
