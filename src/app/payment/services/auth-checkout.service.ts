import { RegisterFunction } from 'app/auth/components/SignUp/useSignUp';
import { logIn, signUp } from 'app/auth/services/auth.service';
import { AppDispatch } from 'app/store';
import { AuthMethodTypes } from '../types';

const authenticateUser = async (
  email: string,
  password: string,
  authMethod: AuthMethodTypes,
  dispatch: AppDispatch,
  doRegister: RegisterFunction,
) => {
  if (authMethod === 'signIn') {
    await logIn(email, password, '', dispatch);
    window.rudderanalytics.track('User Signin in Integrated Checkout', { email });
    window.gtag('event', 'User Signin in Integrated Checkout', { method: 'email' });
  } else if (authMethod === 'signUp') {
    await signUp(doRegister, email, password, '', true, false, dispatch);
  }
};

const authCheckoutService = {
  authenticateUser,
};

export default authCheckoutService;
