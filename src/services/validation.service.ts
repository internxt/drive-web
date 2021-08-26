export const twoFactorRegexPattern = /^\d{3}(\s+)?\d{3}$/;

const validate2FA = (twoFactorCode: string): boolean => {
  const pattern = /^\d{3}(\s+)?\d{3}$/;

  return pattern.test(twoFactorCode);
};

const validateSearchText = (value: string): boolean => {
  const alphanumericDotsAndSpaces = /^[a-zA-Z0-9 ._-]*$/gm;

  return alphanumericDotsAndSpaces.test(value);
};

const validationService = {
  validate2FA,
  validateSearchText
};

export default validationService;