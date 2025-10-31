import { auth } from '@internxt/lib';
import testPasswordStrength from '@internxt/lib/dist/src/auth/testPasswordStrength';
import { useSignUp } from './hooks/useSignup';
import { useGuestSignupState } from './hooks/useGuestSignupState';
import { useInvitationValidation } from './hooks/useInvitationValidation';
import { useGuestSignupForm } from './hooks/useGuestSignupForm';
import navigationService from 'app/core/services/navigation.service';
import { AppView, IFormValues } from 'app/core/types';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import shareService from 'app/share/services/share.service';
import ExpiredLink from 'app/shared/views/ExpiredLink/ExpiredLinkView';
import { useAppDispatch } from 'app/store/hooks';
import { userActions } from 'app/store/slices/user';
import queryString from 'query-string';
import { useEffect } from 'react';
import { SubmitHandler, useForm, useWatch } from 'react-hook-form';
import { MAX_PASSWORD_LENGTH } from 'app/shared/components/ValidPassword';
import CreateAccountForm from './components/CreateAccountForm';
import { guestSignupOnSubmit } from './utils/guestSignupOnSubmit';

function ShareGuestSingUpView(): JSX.Element {
  const { translate } = useTranslationContext();

  const qs = queryString.parse(navigationService.history.location.search);
  const hasEmailParam = (qs.email && auth.isValidEmail(decodeURIComponent(qs.email as string))) || false;

  const getInitialEmailValue = () => {
    if (hasEmailParam) {
      return decodeURIComponent(qs.email as string);
    }
  };

  const {
    register,
    formState: { errors, isValid },
    handleSubmit,
    control,
  } = useForm<IFormValues>({
    mode: 'onChange',
    defaultValues: {
      email: getInitialEmailValue(),
      password: '',
    },
  });

  const dispatch = useAppDispatch();
  const password = useWatch({ control, name: 'password', defaultValue: '' });
  const {
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
  } = useGuestSignupState();
  const { doRegisterPreCreatedUser } = useSignUp('activate');

  const { invitationValidation } = useInvitationValidation({
    validateInvitationFn: shareService.validateSharingInvitation,
    setInvitationId,
  });

  const { bottomInfoError } = useGuestSignupForm({
    errors,
    showError,
    signupError,
  });
  useEffect(() => {
    if (user && mnemonic) {
      dispatch(userActions.setUser(user));
      if (mnemonic) {
        return navigationService.push(AppView.Shared);
      }
    }
  }, []);

  useEffect(() => {
    if (password.length > 0) onChangeHandler(password);
  }, [password]);

  // TODO: Extract this to reuse in other components
  function onChangeHandler(input: string) {
    setIsValidPassword(false);
    if (input.length > MAX_PASSWORD_LENGTH) {
      setPasswordState({ tag: 'error', label: translate('modals.changePasswordModal.errors.longPassword') });
      return;
    }

    const result = testPasswordStrength(input, (qs.email as string) === undefined ? '' : (qs.email as string));

    setIsValidPassword(result.valid);
    if (!result.valid) {
      setPasswordState({
        tag: 'error',
        label:
          result.reason === 'NOT_COMPLEX_ENOUGH'
            ? 'Password is not complex enough'
            : 'Password has to be at least 8 characters long',
      });
    } else if (result.strength === 'medium') {
      setPasswordState({ tag: 'warning', label: 'Password is weak' });
    } else {
      setPasswordState({ tag: 'success', label: 'Password is strong' });
    }
  }

  const onSubmit: SubmitHandler<IFormValues> = async (formData, event) => {
    await guestSignupOnSubmit({
      formData,
      event,
      invitationId: invitationId ?? '',
      doRegisterPreCreatedUser,
      dispatch,
      setIsLoading,
      setSignupError,
      setShowError,
      redirectTo: AppView.Shared,
    });
  };
  if (invitationValidation.isLoading) {
    return <></>;
  }

  if (!invitationValidation.isValid) {
    return <ExpiredLink />;
  }

  return (
    <CreateAccountForm
      handleSubmit={handleSubmit}
      onSubmit={onSubmit}
      translate={translate}
      hasEmailParam={hasEmailParam}
      register={register}
      errors={errors}
      passwordState={passwordState}
      setShowPasswordIndicator={setShowPasswordIndicator}
      showPasswordIndicator={showPasswordIndicator}
      bottomInfoError={bottomInfoError}
      isLoading={isLoading}
      isValidPassword={isValidPassword}
      isValid={isValid}
    />
  );
}

export default ShareGuestSingUpView;
