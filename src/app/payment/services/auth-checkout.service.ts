import { RegisterFunction } from 'app/auth/components/SignUp/useSignUp';
import { logIn, signUp } from 'app/auth/services/auth.service';
import { AppDispatch } from 'app/store';
import { AuthMethodTypes } from '../types';

type AuthParams = {
  email: string;
  password: string;
  authMethod: AuthMethodTypes;
  dispatch: AppDispatch;
  doRegister: RegisterFunction;
};

const authenticateUser = async (params: AuthParams) => {
  const { email, password, authMethod, dispatch, doRegister } = params;
  if (authMethod === 'signIn') {
    await logIn({ email, password, twoFactorCode: '', dispatch });
  } else if (authMethod === 'signUp') {
    const signUpParams = {
      doSignUp: doRegister,
      email,
      password,
      token: '',
      isNewUser: true,
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
