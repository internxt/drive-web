import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import { IFormValues, AppView } from 'app/core/types';
import errorService from 'services/error.service';
import localStorageService from 'services/local-storage.service';
import navigationService from 'services/navigation.service';
import { parseAndDecryptUserKeys } from 'app/crypto/services/keys.service';
import { userActions, userThunks } from 'app/store/slices/user';
import { productsThunks } from 'app/store/slices/products';
import { planThunks } from 'app/store/slices/plan';
import { referralsThunks } from 'app/store/slices/referrals';
import { AppDispatch } from 'app/store';

interface GuestSignupOnSubmitParams {
  formData: IFormValues;
  event?: React.BaseSyntheticEvent;
  invitationId: string;
  doRegisterPreCreatedUser: (
    email: string,
    password: string,
    invitationId: string,
    token: string,
  ) => Promise<{ xUser: any; xToken: string; xNewToken: string; mnemonic: string }>;
  dispatch: AppDispatch;
  setIsLoading: (loading: boolean) => void;
  setSignupError: (error: string) => void;
  setShowError: (show: boolean) => void;
  redirectTo: AppView;
}

export const guestSignupOnSubmit = async ({
  formData,
  event,
  invitationId,
  doRegisterPreCreatedUser,
  dispatch,
  setIsLoading,
  setSignupError,
  setShowError,
  redirectTo,
}: GuestSignupOnSubmitParams) => {
  event?.preventDefault();
  setIsLoading(true);

  try {
    const { email, password, token } = formData;
    const { xUser, xToken, xNewToken, mnemonic } = await doRegisterPreCreatedUser(
      email,
      password,
      invitationId,
      token || '',
    );

    localStorageService.clear();

    localStorageService.set('xToken', xToken);
    localStorageService.set('xMnemonic', mnemonic);
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

    return navigationService.push(redirectTo);
  } catch (err: unknown) {
    setIsLoading(false);
    errorService.reportError(err);
    const castedError = errorService.castError(err);
    setSignupError(castedError.message);
  } finally {
    setShowError(true);
  }
};
