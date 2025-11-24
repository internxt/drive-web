import { logIn, RegisterFunction, signUp, SignUpParams } from 'services/auth.service';
import { AppDispatch } from 'app/store';
import { AuthMethodTypes } from '../types';

type AuthParams = {
  email: string;
  password: string;
  authMethod: AuthMethodTypes;
  captcha: string;
  dispatch: AppDispatch;
  doRegister: RegisterFunction;
};

const authenticateUser = async (params: AuthParams) => {
  const { email, password, authMethod, captcha, dispatch, doRegister } = params;
  if (authMethod === 'signIn') {
    await logIn({ email, password, twoFactorCode: '', dispatch });
  } else if (authMethod === 'signUp') {
    const signUpParams: SignUpParams = {
      doSignUp: doRegister,
      email,
      password,
      token: captcha,
      redeemCodeObject: false,
      dispatch,
    };
    await signUp(signUpParams);
  }
};

const authCheckoutService = {
  authenticateUser,
};

export default authCheckoutService;
