import { isAccountSetupPendingError } from '@internxt/sdk';
import { SdkFactory } from 'app/core/factory/sdk';
import { generateCaptchaToken } from 'utils';

/**
 * Asks Drive to send again the email to finish the setup of an account paid from the checkout.
 * Drive always answers the same way, so the caller can't tell whether the email had a pending setup.
 */
export const resendAccountSetupEmail = async (email: string): Promise<void> => {
  const captchaToken = await generateCaptchaToken();
  const authClient = SdkFactory.getNewApiInstance().createAuthClient({ captchaToken });
  await authClient.resendAccountSetupEmail(email.toLowerCase());
};

/**
 * True when the error comes from an email whose account was paid but its setup is not finished yet.
 * Pass the raw error: `errorService.castError` does not keep the response `code`.
 */
export const isAccountSetupPending = (error: unknown): boolean => isAccountSetupPendingError(error);
