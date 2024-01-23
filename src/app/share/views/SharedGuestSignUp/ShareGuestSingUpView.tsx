import { useState, useEffect } from 'react';
import { SubmitHandler } from 'react-hook-form';
import queryString from 'query-string';
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
import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import { getNewToken } from 'app/auth/services/auth.service';
import { decryptPrivateKey } from 'app/crypto/services/keys.service';
import { useSignUp } from 'app/auth/components/SignUp/useSignUp';
import shareService from 'app/share/services/share.service';
import { ReactComponent as InternxtLogo } from 'assets/icons/big-logo.svg';
import { useSelector } from 'react-redux';
import { RootState } from 'app/store';
import ExpiredLink from 'app/shared/views/ExpiredLink/ExpiredLinkView';

function ShareGuestSingUpView(): JSX.Element {
  const { translate } = useTranslationContext();

  const qs = queryString.parse(navigationService.history.location.search);

  const dispatch = useAppDispatch();
  const [signupError, setSignupError] = useState<Error | string>();
  const [showError, setShowError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { doRegisterPreCreatedUser } = useSignUp('activate');
  const [invitationId, setInvitationId] = useState<string>();
  const user = useSelector((state: RootState) => state.user.user) as UserSettings;
  const mnemonic = localStorageService.get('xMnemonic');

  const [invitationValidation, setInvitationValidation] = useState({
    isLoading: true,
    isValid: false,
  });

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
    <div className={'flex h-full w-full flex-col overflow-auto bg-surface dark:bg-gray-1'}>
      <div className="flex flex-shrink-0 flex-row justify-center py-10 sm:justify-start sm:pl-20">
        <InternxtLogo className="h-auto w-28 text-gray-100" />
      </div>
      <div className="flex h-full w-full flex-col items-center justify-center">
        <div className={'flex h-fit w-96 flex-col items-center justify-center px-8 py-10'}>
          <Helmet>
            <link rel="canonical" href={`${process.env.REACT_APP_HOSTNAME}/shared-guest`} />
          </Helmet>
          <div className="flex flex-col items-start space-y-5">
            <div className="flex flex-col items-start space-y-5">
              <h1 className="text-3xl font-medium">{translate('auth.signup.title')}</h1>

              <form className="flex w-full flex-col space-y-2" onSubmit={handleSubmit(onSubmit)}>
                <TextInput
                  placeholder={translate('auth.email') as string}
                  label="email"
                  type="email"
                  disabled={hasEmailParam}
                  register={register}
                  required={true}
                  minLength={{ value: 1, message: 'Email must not be empty' }}
                  error={errors.email}
                />

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
                    Internxt doesn't store passwords.{' '}
                    <span className="font-semibold">
                      In case you forget your password, you will lose access to all your files.
                    </span>
                  </p>
                </div>

                <Button
                  disabled={isLoading || !isValidPassword}
                  loading={isLoading}
                  variant="primary"
                  className="w-full"
                >
                  {isValid && isValidPassword
                    ? `${translate('auth.signup.encrypting')}...`
                    : translate('auth.signup.title')}
                </Button>
              </form>

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

              <div className="w-full border-b border-gray-10" />

              <div className="flex w-full items-center justify-center space-x-1.5 font-medium">
                <span>{translate('auth.signup.haveAccount')}</span>
                <Link
                  to={getLoginLink()}
                  className="cursor-pointer font-medium text-primary no-underline hover:text-primary focus:text-primary-dark"
                >
                  {translate('auth.signup.login')}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ShareGuestSingUpView;
