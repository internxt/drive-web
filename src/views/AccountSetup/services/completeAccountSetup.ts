import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import { SdkFactory } from 'app/core/factory/sdk';
import { decryptTextWithKey } from 'app/crypto/services/utils';
import { AppDispatch } from 'app/store';
import { startNewAccountSession } from 'services/auth.service';
import { generateCaptchaToken } from 'utils';
import { generateNewAccountCredentials } from 'views/Signup/utils/generateNewAccountCredentials';

interface CompleteAccountSetupParams {
  setupToken: string;
  password: string;
  dispatch: AppDispatch;
}

export const completeAccountSetup = async ({ setupToken, password, dispatch }: CompleteAccountSetupParams) => {
  const captchaToken = await generateCaptchaToken();
  const authClient = SdkFactory.getNewApiInstance().createAuthClient({ captchaToken });
  const credentials = await generateNewAccountCredentials(password);

  const { user, token, newToken } = await authClient.completeAccountSetup({ token: setupToken, ...credentials });
  const mnemonic = decryptTextWithKey(user.mnemonic, password);

  return startNewAccountSession({
    registeredUser: {
      xUser: { ...user, mnemonic } as unknown as UserSettings,
      xToken: token,
      xNewToken: newToken,
      mnemonic,
    },
    password,
    redeemCodeObject: false,
    dispatch,
  });
};
