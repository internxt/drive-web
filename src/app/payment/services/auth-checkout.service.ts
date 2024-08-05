import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import { RegisterFunction } from 'app/auth/components/SignUp/useSignUp';
import { doLogin, getNewToken } from 'app/auth/services/auth.service';
import localStorageService from 'app/core/services/local-storage.service';
import { decryptPrivateKey } from 'app/crypto/services/keys.service';
import { AppDispatch } from 'app/store';
import { planThunks } from 'app/store/slices/plan';
import { productsThunks } from 'app/store/slices/products';
import { referralsThunks } from 'app/store/slices/referrals';
import { initializeUserThunk, userActions, userThunks } from 'app/store/slices/user';
import { AuthMethodTypes } from '../types';

const signUp = async (
  doRegister: RegisterFunction,
  email: string,
  password: string,
  token: string,
  dispatch: AppDispatch,
) => {
  const { xUser, xToken, mnemonic } = await doRegister(email, password, token);

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

  dispatch(referralsThunks.initializeThunk());
};

const logIn = async (email: string, password: string, twoFactorCode: string, dispatch: AppDispatch) => {
  const { user } = await doLogin(email, password, twoFactorCode);
  dispatch(userActions.setUser(user));

  window.rudderanalytics.identify(user.uuid, { email: user.email, uuid: user.uuid });
  window.rudderanalytics.track('User Signin in Integrated Checkout', { email: user.email });
  window.gtag('event', 'User Signin in Integrated Checkout', { method: 'email' });

  try {
    dispatch(productsThunks.initializeThunk());
    dispatch(planThunks.initializeThunk());
    dispatch(referralsThunks.initializeThunk());
    await dispatch(initializeUserThunk()).unwrap();
  } catch (e: unknown) {
    const error = e as Error;

    throw new Error(error.message);
  }

  userActions.setUser(user);
};

const authenticateUser = async (
  email: string,
  password: string,
  authMethod: AuthMethodTypes,
  dispatch: AppDispatch,
  doRegister: RegisterFunction,
) => {
  if (authMethod === 'signIn') {
    await logIn(email, password, '', dispatch);
  } else if (authMethod === 'signUp') {
    await signUp(doRegister, email, password, '', dispatch);
  }
};

const authCheckoutService = {
  signUp,
  logIn,
  authenticateUser,
};

export default authCheckoutService;
