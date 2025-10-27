import { auth } from '@internxt/lib';
import { useSignUp } from '../hooks/useSignup';
import { useGuestSignupState } from '../hooks/useGuestSignupState';
import { useInvitationValidation } from '../hooks/useInvitationValidation';
import { useGuestSignupForm } from '../hooks/useGuestSignupForm';
import navigationService from '../../../app/core/services/navigation.service';
import { AppView, IFormValues } from '../../../app/core/types';
import { useTranslationContext } from '../../../app/i18n/provider/TranslationProvider';
import ExpiredLink from '../../../app/shared/views/ExpiredLink/ExpiredLinkView';
import { useAppDispatch } from '../../../app/store/hooks';
import { userActions } from '../../../app/store/slices/user';
import queryString from 'query-string';
import { useEffect } from 'react';
import { SubmitHandler, useForm, useWatch } from 'react-hook-form';
import { onChangePasswordHandler } from '../utils';
import CreateAccountForm from './CreateAccountForm';
import workspacesService from '../../../app/core/services/workspace.service';
import { guestSignupOnSubmit } from '../utils/guestSignupOnSubmit';

function WorkspaceGuestSingUpView(): JSX.Element {
  const dispatch = useAppDispatch();
  const { translate } = useTranslationContext();
  const qs = queryString.parse(navigationService.history.location.search);
  const hasEmailParam = (qs.email && auth.isValidEmail(decodeURIComponent(qs.email as string))) || false;

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
  const password = useWatch({ control, name: 'password', defaultValue: '' });

  const { invitationValidation } = useInvitationValidation({
    validateInvitationFn: workspacesService.validateWorkspaceInvitation,
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
        return navigationService.push(AppView.Drive);
      }
    }
  }, []);

  useEffect(() => {
    if (password.length > 0)
      onChangePasswordHandler({ password, setPasswordState, setIsValidPassword, email: qs.email });
  }, [password]);

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
      redirectTo: AppView.Drive,
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

export default WorkspaceGuestSingUpView;
