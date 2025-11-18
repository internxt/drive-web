import { describe, it, expect, vi, beforeEach } from 'vitest';
import { onChangePasswordHandler } from './passwordValidation';
import testPasswordStrength from '@internxt/lib/dist/src/auth/testPasswordStrength';

vi.mock(import('@internxt/lib/dist/src/auth/testPasswordStrength'));
vi.mock('i18next', () => ({
  t: vi.fn((key: string) => key),
}));
vi.mock('components/ValidPassword', () => ({
  MAX_PASSWORD_LENGTH: 256,
}));

describe('onChangePasswordHandler', () => {
  const mockSetIsValidPassword = vi.fn();
  const mockSetPasswordState = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should set error state when password exceeds max length', () => {
    const longPassword = 'a'.repeat(257);

    onChangePasswordHandler({
      password: longPassword,
      setIsValidPassword: mockSetIsValidPassword,
      setPasswordState: mockSetPasswordState,
      email: 'test@example.com',
    });

    expect(mockSetIsValidPassword).toHaveBeenCalledWith(false);
    expect(mockSetPasswordState).toHaveBeenCalledWith({
      tag: 'error',
      label: 'modals.changePasswordModal.errors.longPassword',
    });
    expect(testPasswordStrength).not.toHaveBeenCalled();
  });

  it('should set error state when password is not complex enough', () => {
    vi.mocked(testPasswordStrength).mockReturnValue({
      valid: false,
      reason: 'NOT_COMPLEX_ENOUGH',
    });

    onChangePasswordHandler({
      password: 'simple',
      setIsValidPassword: mockSetIsValidPassword,
      setPasswordState: mockSetPasswordState,
      email: 'test@example.com',
    });

    expect(mockSetIsValidPassword).toHaveBeenCalledWith(false);
    expect(mockSetPasswordState).toHaveBeenCalledWith({
      tag: 'error',
      label: 'Password is not complex enough',
    });
  });

  it('should set error state when password is not long enough', () => {
    vi.mocked(testPasswordStrength).mockReturnValue({
      valid: false,
      reason: 'NOT_LONG_ENOUGH',
    });

    onChangePasswordHandler({
      password: 'short',
      setIsValidPassword: mockSetIsValidPassword,
      setPasswordState: mockSetPasswordState,
      email: 'test@example.com',
    });

    expect(mockSetIsValidPassword).toHaveBeenCalledWith(false);
    expect(mockSetPasswordState).toHaveBeenCalledWith({
      tag: 'error',
      label: 'Password has to be at least 8 characters long',
    });
  });

  it('should set warning state when password strength is medium', () => {
    vi.mocked(testPasswordStrength).mockReturnValue({
      valid: true,
      strength: 'medium',
    });

    onChangePasswordHandler({
      password: 'MediumPass123',
      setIsValidPassword: mockSetIsValidPassword,
      setPasswordState: mockSetPasswordState,
      email: 'test@example.com',
    });

    expect(mockSetIsValidPassword).toHaveBeenCalledWith(true);
    expect(mockSetPasswordState).toHaveBeenCalledWith({
      tag: 'warning',
      label: 'Password is weak',
    });
  });

  it('should set success state when password is strong', () => {
    vi.mocked(testPasswordStrength).mockReturnValue({
      valid: true,
      strength: 'hard',
    });

    onChangePasswordHandler({
      password: 'StrongP@ssw0rd!',
      setIsValidPassword: mockSetIsValidPassword,
      setPasswordState: mockSetPasswordState,
      email: 'test@example.com',
    });

    expect(mockSetIsValidPassword).toHaveBeenCalledWith(true);
    expect(mockSetPasswordState).toHaveBeenCalledWith({
      tag: 'success',
      label: 'Password is strong',
    });
  });

  it('should handle empty or null email correctly', () => {
    vi.mocked(testPasswordStrength).mockReturnValue({
      valid: true,
      strength: 'hard',
    });

    onChangePasswordHandler({
      password: 'ValidPassword123!',
      setIsValidPassword: mockSetIsValidPassword,
      setPasswordState: mockSetPasswordState,
      email: undefined,
    });

    expect(testPasswordStrength).toHaveBeenCalledWith('ValidPassword123!', '');
  });
});
