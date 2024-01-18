import { useState, useEffect } from 'react';
import { SubmitHandler, useForm, useWatch } from 'react-hook-form';
import queryString from 'query-string';
import { auth } from '@internxt/lib';
import { WarningCircle } from '@phosphor-icons/react';
import { Helmet } from 'react-helmet-async';
import localStorageService, { STORAGE_KEYS } from 'app/core/services/local-storage.service';
import { useAppDispatch } from 'app/store/hooks';
import { userActions, userThunks } from 'app/store/slices/user';
import { planThunks } from 'app/store/slices/plan';
import errorService from 'app/core/services/error.service';
import navigationService from 'app/core/services/navigation.service';
import { productsThunks } from 'app/store/slices/products';
import { AppView, IFormValues } from 'app/core/types';
import { referralsThunks } from 'app/store/slices/referrals';
import testPasswordStrength from '@internxt/lib/dist/src/auth/testPasswordStrength';
import PasswordStrengthIndicator from 'app/shared/components/PasswordStrengthIndicator';
import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import { getNewToken } from 'app/auth/services/auth.service';
import { MAX_PASSWORD_LENGTH } from '../../../shared/components/ValidPassword';
import { decryptPrivateKey } from 'app/crypto/services/keys.service';
import TextInput from 'app/auth/components/TextInput/TextInput';
import PasswordInput from 'app/auth/components/PasswordInput/PasswordInput';
import Button from 'app/auth/components/Button/Button';
import { useSignUp } from 'app/auth/components/SignUp/useSignUp';
import shareService from 'app/share/services/share.service';
import bigLogo from 'assets/icons/big-logo.svg';
import { useSelector } from 'react-redux';
import { RootState } from 'app/store';
import ExpiredLink from 'app/shared/views/ExpiredLink/ExpiredLinkView';

function ShareGuestSingUpView(): JSX.Element {
  const { translate } = useTranslationContext();
  const [isValidPassword, setIsValidPassword] = useState(false);

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
  const [signupError, setSignupError] = useState<Error | string>();
  const [showError, setShowError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { doRegisterPreCreatedUser } = useSignUp('activate');
  const [passwordState, setPasswordState] = useState<{
    tag: 'error' | 'warning' | 'success';
    label: string;
  } | null>(null);
  const [invitationId, setInvitationId] = useState<string>();
  const [showPasswordIndicator, setShowPasswordIndicator] = useState(false);
  const user = useSelector((state: RootState) => state.user.user) as UserSettings;
  const mnemonic = localStorageService.get('xMnemonic');

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
      if (user?.registerCompleted && mnemonic) {
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
      const { xUser, xToken, mnemonic } = await doRegisterPreCreatedUser(email, password, invitationId ?? '', token);

      localStorageService.removeItem(STORAGE_KEYS.SIGN_UP_TUTORIAL_COMPLETED);

      localStorageService.clear();

      localStorageService.set('xToken', xToken);
      localStorageService.set('xMnemonic', mnemonic);

      const xNewToken = await getNewToken();
      localStorageService.set('xNewToken', xNewToken);

      const decryptedPrivateKey = decryptPrivateKey(xUser.privateKey, password);

      const privateKey = xUser.privateKey ? Buffer.from(decryptedPrivateKey).toString('base64') : undefined;

      const user = {
        ...xUser,
        privateKey,
      } as UserSettings;

      dispatch(userActions.setUser(user));
      await dispatch(userThunks.initializeUserThunk());
      dispatch(productsThunks.initializeThunk());
      dispatch(planThunks.initializeThunk());

      dispatch(referralsThunks.initializeThunk());

      window.rudderanalytics.identify(xUser.uuid, { email, uuid: xUser.uuid });
      window.rudderanalytics.track('User Signup', { email });

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

  return (
    <div className={'flex h-full w-full flex-col overflow-auto bg-white sm:bg-gray-5'}>
      <div className="flex flex-shrink-0 flex-row justify-center py-10 sm:justify-start sm:pl-20">
        <img src={bigLogo} width="120" alt="" />
      </div>

      <div className={'flex h-full flex-col items-center justify-center'}>
        <Helmet>
          <link rel="canonical" href={`${process.env.REACT_APP_HOSTNAME}/shared-guest`} />
        </Helmet>
        <div
          className={
            'flex h-fit w-96 flex-col items-center justify-center rounded-2xl bg-white px-8 py-10 sm:shadow-soft'
          }
        >
          <form className="flex w-full flex-col space-y-6" onSubmit={handleSubmit(onSubmit)}>
            <span className="text-2xl font-medium">{translate('auth.signup.title')}</span>

            <div className="flex flex-col space-y-3">
              <label className="space-y-0.5">
                <span>{translate('auth.email')}</span>
                <TextInput
                  placeholder={translate('auth.email')}
                  label="email"
                  type="email"
                  disabled={hasEmailParam}
                  register={register}
                  required={true}
                  minLength={{ value: 1, message: translate('notificationMessages.emailNotEmpty') }}
                  error={errors.email}
                />
              </label>

              <label className="space-y-0.5">
                <span>{translate('auth.password')}</span>
                <PasswordInput
                  className={passwordState ? passwordState.tag : ''}
                  placeholder={translate('auth.password')}
                  label="password"
                  maxLength={MAX_PASSWORD_LENGTH}
                  register={register}
                  onFocus={() => setShowPasswordIndicator(true)}
                  required={true}
                  error={errors.password}
                />
                {showPasswordIndicator && passwordState && (
                  <PasswordStrengthIndicator
                    className="pt-1"
                    strength={passwordState.tag}
                    label={passwordState.label}
                  />
                )}
                {bottomInfoError && (
                  <div className="flex flex-row items-start pt-1">
                    <div className="flex h-5 flex-row items-center">
                      <WarningCircle weight="fill" className="mr-1 h-4 text-red" />
                    </div>
                    <span className="font-base w-56 text-sm text-red">{bottomInfoError}</span>
                  </div>
                )}
              </label>

              <Button
                disabled={isLoading || !isValidPassword}
                text={translate('auth.signup.title')}
                disabledText={
                  isValid && isValidPassword
                    ? `${translate('auth.signup.encrypting')}...`
                    : translate('auth.signup.title')
                }
                loading={isLoading}
                style="button-primary"
                className="w-full"
              />
            </div>
          </form>
          <span className="mt-2 w-full text-xs text-gray-50">
            {translate('auth.terms1')}{' '}
            <a href="https://internxt.com/legal" target="_blank" className="text-xs text-gray-50 hover:text-gray-80">
              {translate('auth.terms2')}
            </a>
          </span>
        </div>
      </div>

      <div className="flex flex-shrink-0 flex-row justify-center py-8">
        <a
          href="https://internxt.com/legal"
          target="_blank"
          className="font-regular mr-4 mt-6 text-base text-gray-80 no-underline hover:text-gray-100"
        >
          {translate('general.terms')}
        </a>
        <a
          href="https://help.internxt.com"
          target="_blank"
          className="font-regular mr-4 mt-6 text-base text-gray-80 no-underline hover:text-gray-100"
        >
          {translate('general.help')}
        </a>
      </div>
    </div>
  );
}

export default ShareGuestSingUpView;
