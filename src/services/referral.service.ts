import localStorageService from './local-storage.service';
import envService from './env.service';
import { SdkFactory } from 'app/core/factory/sdk';
import { loadExternalScript } from 'utils/loadExternalScript';

interface ReferralUser {
  name: string;
  lastname: string;
  email: string;
}

const UCC_STORAGE_KEY = 'cello_ucc';

let booted = false;

const fetchReferralToken = async (): Promise<string> => {
  const referralsClient = SdkFactory.getNewApiInstance().createReferralsClient();
  const { token } = await referralsClient.createReferralToken();
  return token;
};

const buildReferralConfig = (
  user: ReferralUser,
  token: string,
  productId: string,
  language?: string,
): ReferralBootOptions => ({
  productId,
  token,
  language: language ?? 'en',
  productUserDetails: {
    firstName: user.name,
    lastName: user.lastname,
    fullName: `${user.name} ${user.lastname}`.trim(),
    email: user.email,
  },
  hideDefaultLauncher: true,
});

const initializeSdk = (options: ReferralBootOptions): Promise<void> => {
  globalThis.cello = globalThis.cello || { cmd: [] };

  return new Promise<void>((resolve, reject) => {
    globalThis.cello!.cmd.push(async (cello) => {
      try {
        await cello.boot(options);
        booted = true;
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  });
};

const loadAndBoot = async (user: ReferralUser, language?: string): Promise<void> => {
  if (booted) return;

  const assetsUrl = envService.getVariable('celloAssetsUrl');
  await loadExternalScript(`${assetsUrl}/app/latest/cello.js`);

  const productId = envService.getVariable('celloProductId');
  if (!productId) {
    console.error('Referral product ID is not configured');
    return;
  }

  const token = await fetchReferralToken();
  const options = buildReferralConfig(user, token, productId, language);
  await initializeSdk(options);
};

const openPanel = async (user: ReferralUser, language?: string): Promise<void> => {
  if (!booted) {
    await loadAndBoot(user, language);
  }
  if (!globalThis.Cello) {
    console.error('Referral is not initialized');
    return;
  }
  await globalThis.Cello('open');
};

const captureUccFromUrl = (): string | null => {
  const params = new URLSearchParams(globalThis.location.search);
  const uccFromUrl = params.get('ucc');

  if (uccFromUrl) {
    localStorageService.set(UCC_STORAGE_KEY, uccFromUrl);
    return uccFromUrl;
  }

  return localStorageService.get(UCC_STORAGE_KEY) ?? null;
};

const getStoredUcc = (): string | null => {
  return localStorageService.get(UCC_STORAGE_KEY) ?? null;
};

const referralService = {
  openPanel,
  captureUccFromUrl,
  getStoredUcc,
};

export default referralService;
