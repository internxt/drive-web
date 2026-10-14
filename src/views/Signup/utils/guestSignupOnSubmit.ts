import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import { IFormValues, AppView } from 'app/core/types';
import errorService from 'services/error.service';
import localStorageService from 'services/local-storage.service';
import navigationService from 'services/navigation.service';
import { parseAndDecryptUserKeys } from 'app/crypto/services/keys.service';
import { userThunks } from 'app/store/slices/user';
import { planThunks } from 'app/store/slices/plan';
import { AppDispatch } from 'app/store';
import encryptedStorageService from 'services/encrypted-storage.service';
import { isAccountSetupPending } from 'services/account-setup.service';

interface GuestSignupOnSubmitParams {
  formData: IFormValues;
  event?: React.BaseSyntheticEvent;
  invitationId: string;
  doRegisterPreCreatedUser: (
    email: string,
    password: string,
    invitationId: string,
    token: string,
  ) => Promise<{ xUser: UserSettings; xToken: string; xNewToken: string; mnemonic: string }>;
  dispatch: AppDispatch;
  setIsLoading: (loading: boolean) => void;
  setSignupError: (error: string | undefined) => void;
  setShowError: (show: boolean) => void;
  setPendingSetupEmail: (email: string | null) => void;
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
  setPendingSetupEmail,
  redirectTo,
}: GuestSignupOnSubmitParams) => {
  event?.preventDefault();
  setIsLoading(true);
  const { email, password, token } = formData;

  try {
    const { xUser, xNewToken } = await doRegisterPreCreatedUser(email, password, invitationId, token || '');

    localStorageService.clear();

    await encryptedStorageService.setToken(xNewToken);

    const { publicKey, privateKey, publicKyberKey, privateKyberKey } = parseAndDecryptUserKeys(xUser, password);

    const user: UserSettings = {
      ...xUser,
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
    };

    await dispatch(userThunks.setUserThunk(user));
    await dispatch(userThunks.initializeUserThunk());
    dispatch(planThunks.initializeThunk());

    return navigationService.push(redirectTo);
  } catch (err: unknown) {
    setIsLoading(false);

    if (isAccountSetupPending(err)) {
      setSignupError(undefined);
      setPendingSetupEmail(email);
      return;
    }

    setPendingSetupEmail(null);
    errorService.reportError(err);
    const castedError = errorService.castError(err);
    setSignupError(castedError.message);
  } finally {
    setShowError(true);
  }
};
