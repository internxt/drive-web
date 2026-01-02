import { AppDispatch } from 'app/store';
import { CampaignLinks } from 'app/core/types';
import { AuthMethodTypes } from 'views/Checkout/types';
import { authenticateUser, RegisterFunction } from 'services/auth.service';
import envService from 'services/env.service';
import errorService from 'services/error.service';

type SignupPayload = {
  email: string | null;
  password: string | null;
  token?: string;
};

type SubmitBlogSignupParams = {
  data: SignupPayload;
  dispatch: AppDispatch;
  doRegister: RegisterFunction;
  setLoading: (loading: boolean) => void;
  setError?: (message: string) => void;
  redirectToApp?: boolean;
};

const postMessage = (data: Record<string, unknown>) => {
  window.top?.postMessage(data, CampaignLinks.PcComponentes);
};

export const submitBlogSignup = async ({
  data,
  dispatch,
  doRegister,
  setLoading,
  setError,
  redirectToApp = true,
}: SubmitBlogSignupParams): Promise<void> => {
  if ((data.email === '' && data.password === '') || data.email === null || data.password === null) {
    postMessage({ action: 'autoScroll' });
    setLoading(false);
    return;
  }

  setLoading(true);

  try {
    const { email, password, token } = data;
    await authenticateUser({
      email: email ?? '',
      password: password ?? '',
      authMethod: 'signUp' as AuthMethodTypes,
      twoFactorCode: '',
      dispatch,
      token: token ?? '',
      redeemCodeObject: false,
      doSignUp: doRegister,
    });

    globalThis.gtag?.('event', 'User Signup', { send_to: 'Blog' });
    localStorage.removeItem('email');
    localStorage.removeItem('password');
    if (redirectToApp) {
      window.open(`${envService.getVariable('hostname')}`, '_parent', 'noopener');
    }
  } catch (err: unknown) {
    const message = errorService.castError(err).message;
    if (setError) {
      setError(message);
    } else {
      errorService.reportError(err);
    }
  } finally {
    setLoading(false);
  }
};
