import { auth } from '@internxt/lib';
import testPasswordStrength from '@internxt/lib/dist/src/auth/testPasswordStrength';
import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import { Views } from './SignupForm';
import { useSignUp } from '../hooks/useSignup';
import { useGuestSignupState } from '../hooks/useGuestSignupState';
import errorService from 'app/core/services/error.service';
import localStorageService from 'app/core/services/local-storage.service';
import navigationService from 'app/core/services/navigation.service';
import { AppView, IFormValues } from 'app/core/types';
import { parseAndDecryptUserKeys } from 'app/crypto/services/keys.service';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import shareService from 'app/share/services/share.service';
import ExpiredLink from 'app/shared/views/ExpiredLink/ExpiredLinkView';
import { useAppDispatch } from 'app/store/hooks';
import { planThunks } from 'app/store/slices/plan';
import { productsThunks } from 'app/store/slices/products';
import { referralsThunks } from 'app/store/slices/referrals';
import { userActions, userThunks } from 'app/store/slices/user';
import queryString from 'query-string';
import { useEffect, useState } from 'react';
import { SubmitHandler, useForm, useWatch } from 'react-hook-form';
import { MAX_PASSWORD_LENGTH } from '../../../app/shared/components/ValidPassword';
import CreateAccountForm from './CreateAccountForm';

function ShareGuestSingUpView(): JSX.Element {
  const { translate } = useTranslationContext();
  const [view] = useState<Views>('signUp');

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

  const [invitationValidation, setInvitationValidation] = useState({
    isLoading: true,
    isValid: false,
  });

  const formInputError = Object.values(errors)[0];

  let bottomInfoError: null | string = null;

  if (formInputError?.message) {
    bottomInfoError = formInputError.message;
  } else if (showError && signupError) {
    bottomInfoError = signupError.toString();
  }

  const validateInvitation = async (id: string) => {
    setInvitationValidation((prev) => ({ ...prev, isLoading: true }));

    try {
      await shareService.validateSharingInvitation(id);
      setInvitationId(id);
      setInvitationValidation((prev) => ({ ...prev, isLoading: false, isValid: true }));
    } catch (error) {
      errorService.reportError(error);
      setInvitationValidation((prev) => ({ ...prev, isLoading: false, isValid: false }));
    }
  };

  useEffect(() => {
    const inviteId = qs.invitation as string;

    if (inviteId) {
      validateInvitation(inviteId);
    } else {
      return navigationService.push(AppView.Signup);
    }
  }, [invitationId]);

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
    event?.preventDefault();
    setIsLoading(true);

    try {
      const { email, password, token } = formData;
      const { xUser, xToken, xNewToken, mnemonic } = await doRegisterPreCreatedUser(
        email,
        password,
        invitationId ?? '',
        token,
      );

      localStorageService.clear();

      localStorageService.set('xToken', xToken);
      localStorageService.set('xMnemonic', mnemonic);
      localStorageService.set('xNewToken', xNewToken);

      const { publicKey, privateKey, publicKyberKey, privateKyberKey } = parseAndDecryptUserKeys(xUser, password);

      const user = {
        ...xUser,
        privateKey,
        keys: {
          ecc: {
            publicKey: publicKey,
            privateKey: privateKey,
          },
          kyber: {
            publicKey: publicKyberKey,
            privateKey: privateKyberKey,
          },
        },
      } as UserSettings;

      dispatch(userActions.setUser(user));
      await dispatch(userThunks.initializeUserThunk());
      dispatch(productsThunks.initializeThunk());
      dispatch(planThunks.initializeThunk());

      dispatch(referralsThunks.initializeThunk());

      //TODO: Use this setState when we have to implement the download of the backup key
      // setView('downloadBackupKey');
      return navigationService.push(AppView.Shared);
    } catch (err: unknown) {
      setIsLoading(false);
      errorService.reportError(err);
      const castedError = errorService.castError(err);
      setSignupError(castedError.message);
    } finally {
      setShowError(true);
    }
  };

  if (invitationValidation.isLoading) {
    return <></>;
  }

  if (!invitationValidation.isValid) {
    return <ExpiredLink />;
  }

  if (view === 'downloadBackupKey') {
    //TODO: Use this component when we have to implement the download of the backup key
    // return <DownloadBackupKey onRedirect={onRedirect} />;
    return <></>;
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
