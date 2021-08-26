export const emailRegexPattern = /^((?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*"))@((?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\]))$/;
export const twoFactorRegexPattern = /^\d{3}(\s+)?\d{3}$/;
export const illegalRe = /[\/\?<>\\:\*\|"]/g;
export const controlRe = /[\x00-\x1f\x80-\x9f]/g;
export const reservedRe = /^\.+$/;
export const windowsReservedRe = /^(con|prn|aux|nul|com[0-9]|lpt[0-9])(\..*)?$/i;
export const windowsTrailingRe = /[\. ]+$/;

const validateEmail = (email: string) => {
  // eslint-disable-next-line no-control-regex
  return emailRegexPattern.test(email.toLowerCase());
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
  validateEmail,
  validate2FA,
  validateSearchText
};

export default validationService;