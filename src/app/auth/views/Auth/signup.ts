import errorService from 'app/core/services/error.service';
import localStorageService from 'app/core/services/local-storage.service';
import { planThunks } from 'app/store/slices/plan';
import { productsThunks } from 'app/store/slices/products';
import { referralsThunks } from 'app/store/slices/referrals';
import { userActions, userThunks } from 'app/store/slices/user';
import { CampaignLinks } from 'app/core/types';

const postMessage = (data: Record<string, unknown>) => {
  window.top?.postMessage(data, CampaignLinks.PcComponentes);
};

const signup = async (data, dispatch, doRegister, setLoading, appRedirect?, setError?) => {
  if ((data.email === '' && data.password === '') || data.email === null || data.password === null) {
    postMessage({ action: 'autoScroll' });
    setLoading(false);
    return;
  }
  setLoading(true);

  try {
    const { email, password, token } = data;
    const res = await doRegister(email, password, token);
    const xUser = res.xUser;
    const xToken = res.xToken;
    const mnemonic = res.mnemonic;

    localStorageService.set('xToken', xToken);
    dispatch(userActions.setUser(xUser));
    localStorageService.set('xMnemonic', mnemonic);
    dispatch(productsThunks.initializeThunk());
    dispatch(planThunks.initializeThunk());
    dispatch(referralsThunks.initializeThunk());
    await dispatch(userThunks.initializeUserThunk());

    window.gtag('event', 'User Signup', { send_to: 'Blog' });
    localStorage.removeItem('email');
    localStorage.removeItem('password');
    setLoading(false);
    window.open(`${process.env.REACT_APP_HOSTNAME}`, '_parent', 'noopener');
  } catch (err: unknown) {
    setError(errorService.castError(err).message);
    setLoading(false);
  }
};

export default signup;
