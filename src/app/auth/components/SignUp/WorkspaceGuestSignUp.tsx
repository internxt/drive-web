import { auth } from '@internxt/lib';
import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import { useSignUp } from 'app/auth/components/SignUp/useSignUp';
import { getNewToken } from 'app/auth/services/auth.service';
import errorService from 'app/core/services/error.service';
import localStorageService from 'app/core/services/local-storage.service';
import navigationService from 'app/core/services/navigation.service';
import { AppView, IFormValues } from 'app/core/types';
import { parseAndDecryptUserKeys } from 'app/crypto/services/keys.service';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import ExpiredLink from 'app/shared/views/ExpiredLink/ExpiredLinkView';
import { RootState } from 'app/store';
import { useAppDispatch } from 'app/store/hooks';
import { planThunks } from 'app/store/slices/plan';
import { productsThunks } from 'app/store/slices/products';
import { referralsThunks } from 'app/store/slices/referrals';
import { userActions, userThunks } from 'app/store/slices/user';
import queryString from 'query-string';
import { useEffect, useState } from 'react';
import { SubmitHandler, useForm, useWatch } from 'react-hook-form';
import { useSelector } from 'react-redux';
import { onChangePasswordHandler } from '../../utils';
import CreateAccountForm from './CreateAccountForm';
import workspacesService from 'app/core/services/workspace.service';

function WorkspaceGuestSingUpView(): JSX.Element {
  const dispatch = useAppDispatch();
  const { translate } = useTranslationContext();
  const qs = queryString.parse(navigationService.history.location.search);
  const hasEmailParam = (qs.email && auth.isValidEmail(decodeURIComponent(qs.email as string))) || false;

  const [isValidPassword, setIsValidPassword] = useState(false);
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
      await workspacesService.validateWorkspaceInvitation(id);
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
        return navigationService.push(AppView.Drive);
      }
    }
  }, []);

  useEffect(() => {
    if (password.length > 0)
      onChangePasswordHandler({ password, setPasswordState, setIsValidPassword, email: qs.email });
  }, [password]);

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

      return navigationService.push(AppView.Drive);
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
