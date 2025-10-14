import { AuthParams, SignUpParams } from 'app/auth/services/auth.types';
import { logIn, signUp } from 'app/auth/services/auth.service';


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
