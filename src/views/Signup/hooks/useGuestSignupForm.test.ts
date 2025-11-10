import { renderHook } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useGuestSignupForm } from './useGuestSignupForm';
import { FieldErrors } from 'react-hook-form';
import { IFormValues } from 'app/core/types';

describe('useGuestSignupForm', () => {
  it('should return null when no errors', () => {
    const { result } = renderHook(() =>
      useGuestSignupForm({
        errors: {},
        showError: false,
        signupError: null,
      }),
    );

    expect(result.current.bottomInfoError).toBeNull();
  });

  it('should return form error message when present', () => {
    const errors: FieldErrors<IFormValues> = {
      email: { type: 'required', message: 'Email is required' },
    };

    const { result } = renderHook(() =>
      useGuestSignupForm({
        errors,
        showError: false,
        signupError: null,
      }),
    );

    expect(result.current.bottomInfoError).toBe('Email is required');
  });

  it('should return signup error when showError is true and signupError is present', () => {
    const { result } = renderHook(() =>
      useGuestSignupForm({
        errors: {},
        showError: true,
        signupError: 'Registration failed',
      }),
    );

    expect(result.current.bottomInfoError).toBe('Registration failed');
  });

  it('should return null when showError is false even if signupError exists', () => {
    const { result } = renderHook(() =>
      useGuestSignupForm({
        errors: {},
        showError: false,
        signupError: 'Registration failed',
      }),
    );

    expect(result.current.bottomInfoError).toBeNull();
  });
});
