import copy from "copy-to-clipboard";
const CryptoJS = require('crypto-js')

function copyToClipboard(text) {
  copy(text);
}

// Method to hash password. If salt is passed, use it, in other case use crypto lib for generate salt
function passToHash(passObject) {
  try {
    const salt = passObject.salt ? CryptoJS.enc.Hex.parse(passObject.salt) : CryptoJS.lib.WordArray.random(128/8);
    const hash = CryptoJS.PBKDF2(passObject.password, salt, { keySize: 256/32, iterations: 10000 });
    const hashedObjetc = {
      salt : salt.toString(),
      hash : hash.toString()
    }
    return hashedObjetc;
  } catch (error) {
    throw new Error(error);
  }
}

// AES Plain text encryption method
function encryptText(textToEncrypt) {
  try {
    const bytes = CryptoJS.AES.encrypt(textToEncrypt, process.env.REACT_APP_CRYPTO_SECRET).toString();
    const text64 = CryptoJS.enc.Base64.parse(bytes);
    return text64.toString(CryptoJS.enc.Hex);
  } catch (error) {
    throw new Error(error);
  }
}

// AES Plain text decryption method
function decryptText(encryptedText) {
  try {
    const reb = CryptoJS.enc.Hex.parse(encryptedText);
    const bytes = CryptoJS.AES.decrypt(reb.toString(CryptoJS.enc.Base64), process.env.REACT_APP_CRYPTO_SECRET);
    return bytes.toString(CryptoJS.enc.Utf8);
  } catch (error) {
    throw new Error(error);
  }
}

// AES Plain text encryption method with enc. key
function encryptTextWithKey(textToEncrypt, keyToEncrypt) {
  try {
    const bytes = CryptoJS.AES.encrypt(textToEncrypt, keyToEncrypt).toString();
    const text64 = CryptoJS.enc.Base64.parse(bytes);
    return text64.toString(CryptoJS.enc.Hex);
  } catch (error) {
    throw new Error(error);
  }
}

// AES Plain text decryption method with enc. key
function decryptTextWithKey(encryptedText, keyToDecrypt) {
  try {
    const reb = CryptoJS.enc.Hex.parse(encryptedText);
    const bytes = CryptoJS.AES.decrypt(reb.toString(CryptoJS.enc.Base64), keyToDecrypt);
    return bytes.toString(CryptoJS.enc.Utf8);
  } catch (error) {
    throw new Error(error);
  }
}

export {
  copyToClipboard,
  passToHash,
  encryptText,
  decryptText,
  encryptTextWithKey,
  decryptTextWithKey
}
