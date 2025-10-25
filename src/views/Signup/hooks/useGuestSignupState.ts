import { useState } from 'react';
import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import { useSelector } from 'react-redux';
import { RootState } from 'app/store';
import localStorageService from 'app/core/services/local-storage.service';

export interface PasswordState {
  tag: 'error' | 'warning' | 'success';
  label: string;
}

export const useGuestSignupState = () => {
  const [isValidPassword, setIsValidPassword] = useState(false);
  const [signupError, setSignupError] = useState<Error | string>();
  const [showError, setShowError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [passwordState, setPasswordState] = useState<PasswordState | null>(null);
  const [invitationId, setInvitationId] = useState<string>();
  const [showPasswordIndicator, setShowPasswordIndicator] = useState(false);

  const user = useSelector((state: RootState) => state.user.user) as UserSettings;
  const mnemonic = localStorageService.get('xMnemonic');

  return {
    isValidPassword,
    setIsValidPassword,
    signupError,
    setSignupError,
    showError,
    setShowError,
    isLoading,
    setIsLoading,
    passwordState,
    setPasswordState,
    invitationId,
    setInvitationId,
    showPasswordIndicator,
    setShowPasswordIndicator,
    user,
    mnemonic,
  };
};
