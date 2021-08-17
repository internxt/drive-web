import copy from 'copy-to-clipboard';
import CryptoJS from 'crypto-js';
import AesUtil from './AesUtil';

interface PassObjectInterface {
  salt?: string | null
  password: string
}

function copyToClipboard(text: string): void {
  copy(text);
}

// Method to hash password. If salt is passed, use it, in other case use crypto lib for generate salt
function passToHash(passObject: PassObjectInterface) {
  try {
    const salt = passObject.salt ? CryptoJS.enc.Hex.parse(passObject.salt) : CryptoJS.lib.WordArray.random(128 / 8);
    const hash = CryptoJS.PBKDF2(passObject.password, salt, { keySize: 256 / 32, iterations: 10000 });
    const hashedObjetc = {
      salt: salt.toString(),
      hash: hash.toString()
    };

    return hashedObjetc;
  } catch (error) {
    throw error;
  }
}

// AES Plain text encryption method
function encryptText(textToEncrypt: string): string {
  return encryptTextWithKey(textToEncrypt, process.env.REACT_APP_CRYPTO_SECRET);
}

// AES Plain text decryption method
function decryptText(encryptedText: string): string {
  return decryptTextWithKey(encryptedText, process.env.REACT_APP_CRYPTO_SECRET);
}

// AES Plain text encryption method with enc. key
function encryptTextWithKey(textToEncrypt: string, keyToEncrypt: string): string {
  try {
    const bytes = CryptoJS.AES.encrypt(textToEncrypt, keyToEncrypt).toString();
    const text64 = CryptoJS.enc.Base64.parse(bytes);

    return text64.toString(CryptoJS.enc.Hex);
  } catch (error) {
    throw error;
  }
}

// AES Plain text decryption method with enc. key
function decryptTextWithKey(encryptedText: string, keyToDecrypt: string): string {
  if (!keyToDecrypt) {
    throw new Error('No key defined. Check .env file');
  }
  try {
    const reb = CryptoJS.enc.Hex.parse(encryptedText);
    const bytes = CryptoJS.AES.decrypt(reb.toString(CryptoJS.enc.Base64), keyToDecrypt);

    return bytes.toString(CryptoJS.enc.Utf8);
  } catch (error) {
    throw error;
  }
}

interface IGetFilenameAndExt {
  filename: string,
  extension: string
}

/**
 * Separates entire filename in filename and extension
 * @param entireFilename Filename + extension
 * @returns Filename and extension splitted
 */
function getFilenameAndExt(entireFilename: string): IGetFilenameAndExt {
  // based on path.parse native nodejs function
  const re = /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;

  const fileInfo = re.exec(entireFilename);

  if (!fileInfo) {
    return { filename: '', extension: '' };
  }

  const extensionWithDot = fileInfo[4];
  const filename = fileInfo[3].substring(0, fileInfo[3].length - extensionWithDot.length);

  const extension = extensionWithDot.split('.')[1];

  return { filename, extension };
}

function encryptFilename(filename:string, folderId: string) {
  const { REACT_APP_CRYPTO_SECRET2: CRYPTO_KEY } = process.env;

  if (!CRYPTO_KEY) {
    throw new Error('Cannot encrypt filename due to missing encryption key');
  }

  return AesUtil.encrypt(filename, `${CRYPTO_KEY}-${folderId}`);
}

export {
  copyToClipboard,
  passToHash,
  encryptText,
  decryptText,
  encryptFilename,
  encryptTextWithKey,
  decryptTextWithKey,
  getFilenameAndExt
};
