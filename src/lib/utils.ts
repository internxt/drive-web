import copy from "copy-to-clipboard";
import CryptoJS from "crypto-js";

function copyToClipboard(text: string) {
  copy(text);
}

// Method to remove accents and other special characters from string
function removeAccents(string: string) {
  const accents = 'ÀÁÂÃÄÅĄĀāàáâãäåąßÒÓÔÕÕÖØŐòóôőõöøĎďDŽdžÈÉÊËĘèéêëęðÇçČčĆćÐÌÍÎÏĪìíîïīÙÚÛÜŰùűúûüĽĹŁľĺłÑŇŃňñńŔŕŠŚŞšśşŤťŸÝÿýŽŻŹžżźđĢĞģğ';
  const accentsOut = 'AAAAAAAAaaaaaaaasOOOOOOOOoooooooDdDZdzEEEEEeeeeeeCcCcCcDIIIIIiiiiiUUUUUuuuuuLLLlllNNNnnnRrSSSsssTtYYyyZZZzzzdGGgg';
  return string.split('').map((letter, index) => {
    const accentIndex = accents.indexOf(letter);
    return accentIndex !== -1 ? accentsOut[accentIndex] : letter;
  }).join('');
}

interface PassObjectInterface {
  salt?: string | null
  password: string
}

// Method to hash password. If salt is passed, use it, in other case use crypto lib for generate salt
function passToHash(passObject: PassObjectInterface) {
  try {
    const salt = passObject.salt ? CryptoJS.enc.Hex.parse(passObject.salt) : CryptoJS.lib.WordArray.random(128 / 8);
    const hash = CryptoJS.PBKDF2(passObject.password, salt, { keySize: 256 / 32, iterations: 10000 });
    const hashedObjetc = {
      salt: salt.toString(),
      hash: hash.toString()
    }
    return hashedObjetc;
  } catch (error) {
    throw error;
  }
}

// AES Plain text encryption method
function encryptText(textToEncrypt: string) {
  return encryptTextWithKey(textToEncrypt, process.env.REACT_APP_CRYPTO_SECRET);
}

// AES Plain text decryption method
function decryptText(encryptedText: string) {
  return decryptTextWithKey(encryptedText, process.env.REACT_APP_CRYPTO_SECRET);
}

// AES Plain text encryption method with enc. key
function encryptTextWithKey(textToEncrypt: string, keyToEncrypt: string) {
  try {
    const bytes = CryptoJS.AES.encrypt(textToEncrypt, keyToEncrypt).toString();
    const text64 = CryptoJS.enc.Base64.parse(bytes);
    return text64.toString(CryptoJS.enc.Hex);
  } catch (error) {
    throw error;
  }
}

// AES Plain text decryption method with enc. key
function decryptTextWithKey(encryptedText: string, keyToDecrypt: string) {
  if (!keyToDecrypt) {
    throw new Error('No key defined. Check .env file')
  }
  try {
    const reb = CryptoJS.enc.Hex.parse(encryptedText);
    const bytes = CryptoJS.AES.decrypt(reb.toString(CryptoJS.enc.Base64), keyToDecrypt);
    return bytes.toString(CryptoJS.enc.Utf8);
  } catch (error) {
    throw error;
  }
}


export {
  copyToClipboard,
  removeAccents,
  passToHash,
  encryptText,
  decryptText,
  encryptTextWithKey,
  decryptTextWithKey,
}
