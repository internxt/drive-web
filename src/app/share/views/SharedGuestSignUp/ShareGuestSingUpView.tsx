import { auth } from '@internxt/lib';
import testPasswordStrength from '@internxt/lib/dist/src/auth/testPasswordStrength';
import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import { Info, WarningCircle } from '@phosphor-icons/react';
import PasswordInput from 'app/auth/components/PasswordInput/PasswordInput';
import { Views } from 'app/auth/components/SignUp/SignUp';
import { useSignUp } from 'app/auth/components/SignUp/useSignUp';
import TextInput from 'app/auth/components/TextInput/TextInput';
import { getNewToken } from 'app/auth/services/auth.service';
import errorService from 'app/core/services/error.service';
import localStorageService from 'app/core/services/local-storage.service';
import navigationService from 'app/core/services/navigation.service';
import { AppView, IFormValues } from 'app/core/types';
import { parseAndDecryptUserKeys } from 'app/crypto/services/keys.service';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import shareService from 'app/share/services/share.service';
import { Button } from '@internxt/ui';
import PasswordStrengthIndicator from 'app/shared/components/PasswordStrengthIndicator';
import ExpiredLink from 'app/shared/views/ExpiredLink/ExpiredLinkView';
import { RootState } from 'app/store';
import { useAppDispatch } from 'app/store/hooks';
import { planThunks } from 'app/store/slices/plan';
import { productsThunks } from 'app/store/slices/products';
import { referralsThunks } from 'app/store/slices/referrals';
import { userActions, userThunks } from 'app/store/slices/user';
import { ReactComponent as InternxtLogo } from 'assets/icons/big-logo.svg';
import queryString from 'query-string';
import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { SubmitHandler, useForm, useWatch } from 'react-hook-form';
import { useSelector } from 'react-redux';
import { MAX_PASSWORD_LENGTH } from '../../../shared/components/ValidPassword';

function ShareGuestSingUpView(): JSX.Element {
  const { translate } = useTranslationContext();
  const [isValidPassword, setIsValidPassword] = useState(false);
  const [view, setView] = useState<Views>('signUp');

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

      localStorageService.clear();

      localStorageService.set('xToken', xToken);
      localStorageService.set('xMnemonic', mnemonic);

      const xNewToken = await getNewToken();
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

  return (
    <div className={'flex h-full w-full flex-col overflow-auto bg-surface dark:bg-gray-1'}>
      <div className="flex shrink-0 flex-row justify-center py-10 sm:justify-start sm:pl-20">
        <InternxtLogo className="h-auto w-28 text-gray-100" />
      </div>

      <div className={'flex h-full flex-col items-center justify-center'}>
        <Helmet>
          <link rel="canonical" href={`${process.env.REACT_APP_HOSTNAME}/shared-guest`} />
        </Helmet>
        <div className={'flex h-fit w-96 flex-col items-center justify-center rounded-2xl px-8 py-10'}>
          {view === 'downloadBackupKey' ? (
            //TODO: Use this component when we have to implement the download of the backup key
            // <DownloadBackupKey onRedirect={onRedirect} />
            <></>
          ) : (
            <div className="flex flex-col items-start space-y-5">
              <form className="flex w-full flex-col space-y-5" onSubmit={handleSubmit(onSubmit)}>
                <h1 className="text-3xl font-medium">{translate('auth.signup.title')}</h1>
                <div className="flex flex-col space-y-3">
                  <label className="space-y-0.5">
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

                  <div className="flex space-x-2.5 rounded-lg bg-primary/10 p-3 pr-4 dark:bg-primary/20">
                    <Info size={20} className="shrink-0 text-primary" />
                    <p className="text-xs">
                      {translate('auth.signup.info.normalText')}{' '}
                      <span className="font-semibold">{translate('auth.signup.info.boldText')}</span>{' '}
                      <span className="font-semibold text-primary underline">
                        <a
                          href="https://help.internxt.com/en/articles/8450457-how-do-i-create-a-backup-key"
                          target="_blank"
                        >
                          {translate('auth.signup.info.cta')}
                        </a>
                      </span>
                    </p>
                  </div>

                  <Button
                    disabled={isLoading || !isValidPassword}
                    loading={isLoading}
                    variant="primary"
                    className="w-full"
                    type="submit"
                  >
                    {isLoading && isValid && isValidPassword
                      ? `${translate('auth.signup.encrypting')}...`
                      : translate('auth.signup.title')}
                  </Button>
                </div>
                <span className="mt-2 w-full text-xs text-gray-50">
                  {translate('auth.terms1')}{' '}
                  <a
                    href="https://internxt.com/legal"
                    target="_blank"
                    className="text-xs text-gray-50 hover:text-gray-60"
                  >
                    {translate('auth.terms2')}
                  </a>
                </span>
              </form>
            </div>
          )}
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
