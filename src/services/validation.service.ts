import { auth } from '@internxt/lib';

export const twoFactorRegexPattern = /^\d{3}(\s+)?\d{3}$/;
export const illegalRe = /[\/\?<>\\:\*\|"]/g;
export const controlRe = /[\x00-\x1f\x80-\x9f]/g;
export const reservedRe = /^\.+$/;
export const windowsReservedRe = /^(con|prn|aux|nul|com[0-9]|lpt[0-9])(\..*)?$/i;
export const windowsTrailingRe = /[\. ]+$/;

const validateLoginForm = (email: string, password: string): boolean => {
  let isValid = true;

  if (email.length < 5 || !auth.isValidEmail(email)) {
    isValid = false;
  }
  if (password.length < 1) {
    isValid = false;
  }

  return isValid;
};

const validate2FA = (twoFactorCode: string): boolean => {
  const pattern = /^\d{3}(\s+)?\d{3}$/;

  return pattern.test(twoFactorCode);
};

const validateSearchText = (value: string): boolean => {
  const alphanumericDotsAndSpaces = /^[a-zA-Z0-9 ._-]*$/gm;

  return alphanumericDotsAndSpaces.test(value);
};

const validationService = {
  validateLoginForm,
  validate2FA,
  validateSearchText
};

export default validationService;