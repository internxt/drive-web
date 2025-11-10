import { FieldErrors } from 'react-hook-form';
import { IFormValues } from 'app/core/types';

interface UseGuestSignupFormProps {
  errors: FieldErrors<IFormValues>;
  showError: boolean;
  signupError: string | Error | null | undefined;
}

export const useGuestSignupForm = ({ errors, showError, signupError }: UseGuestSignupFormProps) => {
  const formInputError = Object.values(errors)[0];

  let bottomInfoError: null | string = null;

  if (formInputError?.message) {
    bottomInfoError = formInputError.message;
  } else if (showError && signupError) {
    bottomInfoError = signupError.toString();
  }

  return { bottomInfoError };
};
