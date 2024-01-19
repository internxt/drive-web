import { useState, useEffect } from 'react';
import { SubmitHandler, useForm, useWatch } from 'react-hook-form';
import queryString from 'query-string';
import { auth } from '@internxt/lib';
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
import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import { getNewToken } from 'app/auth/services/auth.service';
import { MAX_PASSWORD_LENGTH } from '../../../shared/components/ValidPassword';
import { decryptPrivateKey } from 'app/crypto/services/keys.service';
import { useSignUp } from 'app/auth/components/SignUp/useSignUp';
import shareService from 'app/share/services/share.service';
import { ReactComponent as InternxtLogo } from 'assets/icons/big-logo.svg';
import { useSelector } from 'react-redux';
import { RootState } from 'app/store';
import ExpiredLink from 'app/shared/views/ExpiredLink/ExpiredLinkView';
import SignupForm from 'app/auth/components/SignUp/SignupForm';

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
  const [invitationId, setInvitationId] = useState<string>();
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
            <SignupForm onSubmit={onSubmit} isLoading={isLoading} signupError={signupError} showError={showError} />
          </div>
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
