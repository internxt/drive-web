import {
  hybridDecryptMessageWithPrivateKey,
  hybridEncryptMessageWithPublicKey,
} from '../../crypto/services/pgp.service';
import encryptedStorageService from 'services/encrypted-storage.service';
import notificationsService, { ToastType } from '../../notifications/services/notifications.service';
import { t } from 'i18next';
import errorService from 'services/error.service';

export const decryptMnemonic = async (encryptionKey: string): Promise<string | undefined> => {
  const user = encryptedStorageService.getUser();
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
    const error = errorService.castError('User Not Found');
    errorService.reportError(error);

    notificationsService.show({
      text: t('error.decryptMnemonic', { message: error.message }),
      type: ToastType.Error,
    });
  }
};

export const encryptMnemonic = async (
  mnemonic: string,
  publicKeyInBase64: string,
  publicKyberKeyBase64: string,
): Promise<string> => {
  return hybridEncryptMessageWithPublicKey({
    message: mnemonic,
    publicKeyInBase64,
    publicKyberKeyBase64,
  });
};
