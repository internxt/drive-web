import { useState, useEffect } from 'react';
import errorService from 'app/core/services/error.service';
import navigationService from 'app/core/services/navigation.service';
import { AppView } from 'app/core/types';

interface UseInvitationValidationProps {
  validateInvitationFn: (id: string) => Promise<unknown>;
  setInvitationId: (id: string) => void;
}

export const useInvitationValidation = ({ validateInvitationFn, setInvitationId }: UseInvitationValidationProps) => {
  const [invitationValidation, setInvitationValidation] = useState({
    isLoading: true,
    isValid: false,
  });

  const validateInvitation = async (id: string) => {
    setInvitationValidation((prev) => ({ ...prev, isLoading: true }));

    try {
      await validateInvitationFn(id);
      setInvitationId(id);
      setInvitationValidation((prev) => ({ ...prev, isLoading: false, isValid: true }));
    } catch (error) {
      errorService.reportError(error);
      setInvitationValidation((prev) => ({ ...prev, isLoading: false, isValid: false }));
    }
  };

  useEffect(() => {
    const urlParams = new URLSearchParams(globalThis.location.search);
    const inviteId = urlParams.get('invitation');
    if (inviteId) {
      validateInvitation(inviteId);
    } else {
      navigationService.push(AppView.Signup);
    }
  }, []);

  return { invitationValidation, validateInvitation };
};
