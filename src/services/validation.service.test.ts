import { describe, it, expect } from 'vitest';
import validationService from './validation.service';

describe('validationService', () => {
  describe('validate2FA', () => {
    it('should validate 6-digit codes with optional spaces between groups', () => {
      expect(validationService.validate2FA('123456')).toBe(true);
      expect(validationService.validate2FA('123 456')).toBe(true);
      expect(validationService.validate2FA('123  456')).toBe(true);
    });

    it('should reject codes with wrong length, non-digits, or incorrect spacing', () => {
      expect(validationService.validate2FA('12345')).toBe(false);
      expect(validationService.validate2FA('1234567')).toBe(false);
      expect(validationService.validate2FA('abc123')).toBe(false);
      expect(validationService.validate2FA('12 3456')).toBe(false);
      expect(validationService.validate2FA('')).toBe(false);
    });
  });

  describe('validateSearchText', () => {
    it('should accept alphanumeric characters, spaces, dots, underscores, and hyphens', () => {
      expect(validationService.validateSearchText('file name.txt')).toBe(true);
      expect(validationService.validateSearchText('document_2024-final')).toBe(true);
      expect(validationService.validateSearchText('ABC123')).toBe(true);
      expect(validationService.validateSearchText('')).toBe(true);
    });

    it('should reject special characters not allowed in search', () => {
      expect(validationService.validateSearchText('file@name')).toBe(false);
      expect(validationService.validateSearchText('file#name')).toBe(false);
      expect(validationService.validateSearchText('file/name')).toBe(false);
    });
  });

  describe('validatePasswordInput', () => {
    it('should accept latin alphabet, numbers, Spanish ñ/Ñ, and common symbols', () => {
      expect(validationService.validatePasswordInput('Password123')).toBe(true);
      expect(validationService.validatePasswordInput('P@ssw0rd!')).toBe(true);
      expect(validationService.validatePasswordInput('contraseña')).toBe(true);
      expect(validationService.validatePasswordInput(String.raw`~!@#$%^&*()_-+={}[]|\:;"'<,>.?/`)).toBe(true);
      expect(validationService.validatePasswordInput('')).toBe(true);
    });

    it('should reject non-latin characters and unsupported symbols', () => {
      expect(validationService.validatePasswordInput('password™')).toBe(false);
      expect(validationService.validatePasswordInput('password€')).toBe(false);
      expect(validationService.validatePasswordInput('пароль')).toBe(false);
    });
  });
});
