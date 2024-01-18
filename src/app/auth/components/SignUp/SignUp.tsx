import { useState, useMemo } from 'react';
import { SubmitHandler } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import localStorageService, { STORAGE_KEYS } from 'app/core/services/local-storage.service';
import queryString from 'query-string';

import { useAppDispatch } from 'app/store/hooks';
import { userActions, userThunks } from 'app/store/slices/user';
import { planThunks } from 'app/store/slices/plan';
import errorService from 'app/core/services/error.service';
import navigationService from 'app/core/services/navigation.service';
import { productsThunks } from 'app/store/slices/products';
import { AppView, IFormValues } from 'app/core/types';
import { referralsThunks } from 'app/store/slices/referrals';
import { useSignUp } from './useSignUp';
import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import authService, { getNewToken } from 'app/auth/services/auth.service';
import PreparingWorkspaceAnimation from '../PreparingWorkspaceAnimation/PreparingWorkspaceAnimation';
import paymentService from 'app/payment/services/payment.service';
import { decryptPrivateKey } from 'app/crypto/services/keys.service';
import analyticsService from 'app/analytics/services/analytics.service';
import SignupForm from './SignupForm';

export interface SignUpProps {
  location: {
    search: string;
  };
  isNewUser: boolean;
}

function SignUp(props: SignUpProps): JSX.Element {
  const { translate } = useTranslationContext();

  const qs = queryString.parse(navigationService.history.location.search);
  const autoSubmit = useMemo(
    () => authService.extractOneUseCredentialsForAutoSubmit(new URLSearchParams(window.location.search)),
    [],
  );
  const hasReferrer = !!qs.ref;
  const { updateInfo, doRegister } = useSignUp(
    qs.register === 'activate' ? 'activate' : 'appsumo',
    hasReferrer ? String(qs.ref) : undefined,
  );

  const dispatch = useAppDispatch();
  const [signupError, setSignupError] = useState<Error | string>();
  const [showError, setShowError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const showPreparingWorkspaceAnimation = useMemo(() => autoSubmit.enabled && !showError, [autoSubmit, showError]);

  const onSubmit: SubmitHandler<IFormValues> = async (formData, event) => {
    const redeemCodeObject = autoSubmit.credentials && autoSubmit.credentials.redeemCodeObject;
    event?.preventDefault();
    setIsLoading(true);

    try {
      const { isNewUser } = props;
      const { email, password, token } = formData;
      const { xUser, xToken, mnemonic } = isNewUser
        ? await doRegister(email, password, token)
        : await updateInfo(email, password);

      localStorageService.removeItem(STORAGE_KEYS.SIGN_UP_TUTORIAL_COMPLETED);

      localStorageService.clear();

      localStorageService.set('xToken', xToken);
      localStorageService.set('xMnemonic', mnemonic);

      const xNewToken = await getNewToken();
      localStorageService.set('xNewToken', xNewToken);

      const privateKey = xUser.privateKey
        ? Buffer.from(await decryptPrivateKey(xUser.privateKey, password)).toString('base64')
        : undefined;

      const user = {
        ...xUser,
        privateKey,
      } as UserSettings;

      dispatch(userActions.setUser(user));
      await dispatch(userThunks.initializeUserThunk());
      dispatch(productsThunks.initializeThunk());
      dispatch(planThunks.initializeThunk());

      if (isNewUser) {
        dispatch(referralsThunks.initializeThunk());
      }

      await analyticsService.trackSignUp(xUser.uuid, email);

      const urlParams = new URLSearchParams(window.location.search);
      const isUniversalLinkMode = urlParams.get('universalLink') == 'true';

      const redirectUrl = authService.getRedirectUrl(urlParams, xToken);

      if (redirectUrl) {
        window.location.replace(redirectUrl);
        return;
      } else if (redeemCodeObject) {
        await paymentService.redeemCode(redeemCodeObject).catch((err) => {
          errorService.reportError(err);
        });
        dispatch(planThunks.initializeThunk());
        navigationService.push(AppView.Drive);
      } else {
        if (isUniversalLinkMode) {
          return navigationService.push(AppView.UniversalLinkSuccess);
        } else {
          return navigationService.push(AppView.Drive);
        }
      }
    } catch (err: unknown) {
      setIsLoading(false);
      errorService.reportError(err);
      const castedError = errorService.castError(err);
      setSignupError(castedError.message);
    } finally {
      setShowError(true);
    }
  };

  const getLoginLink = () => {
    const currentParams = new URLSearchParams(window.location.search);

    return currentParams.toString() ? '/login?' + currentParams.toString() : '/login';
  };

  const View = ({ view }) => {
    const views = {
      signUp: (
        <SignupForm
          onSubmit={onSubmit}
          isLoading={isLoading}
          signupError={signupError}
          autoSubmit={autoSubmit}
          showError={showError}
        />
      ),
    };

    return views[view];
  };

  return (
    <>
      <Helmet>
        <link rel="canonical" href={`${process.env.REACT_APP_HOSTNAME}/new`} />
      </Helmet>
      <div
        className={`flex ${
          showPreparingWorkspaceAnimation
            ? 'h-full w-full'
            : 'h-fit w-96 flex-col items-center justify-center px-8 py-10'
        }`}
      >
        {showPreparingWorkspaceAnimation ? (
          <PreparingWorkspaceAnimation />
        ) : (
          <div className="flex flex-col items-start space-y-5">
            <View view="signUp" />
            <span className="mt-2 w-full text-xs text-gray-50">
              {translate('auth.terms1')}{' '}
              <a href="https://internxt.com/legal" target="_blank" className="text-xs text-gray-50 hover:text-gray-60">
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
        )}
      </div>
    </>
  );
}

export default SignUp;
