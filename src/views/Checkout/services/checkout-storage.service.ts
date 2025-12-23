import localStorageService from 'services/local-storage.service';
import { STORAGE_KEYS } from 'services/storage-keys';

const CHECKOUT_STORAGE_KEYS = {
  CUSTOMER_ID: 'customerId',
  TOKEN: 'token',
  CUSTOMER_TOKEN: 'customerToken',
  PRICE_ID: 'priceId',
  MOBILE_TOKEN: 'mobileToken',
  CURRENCY: 'currency',
} as const;

type CheckoutStorageKey = (typeof CHECKOUT_STORAGE_KEYS)[keyof typeof CHECKOUT_STORAGE_KEYS];

interface MobileCheckoutData {
  customerId: string;
  token: string;
  priceId: string;
  mobileToken: string;
}

const checkoutStorageService = {
  get: (key: CheckoutStorageKey): string | null => {
    return localStorageService.get(key);
  },

  set: (key: CheckoutStorageKey, value: string): void => {
    localStorageService.set(key, value);
  },

  getGclid: (): string | null => {
    return localStorageService.get(STORAGE_KEYS.GCLID);
  },

  setGclid: (gclid: string): void => {
    localStorageService.set(STORAGE_KEYS.GCLID, gclid);
  },

  saveMobileCheckoutData: (data: MobileCheckoutData): void => {
    localStorageService.set(CHECKOUT_STORAGE_KEYS.CUSTOMER_ID, data.customerId);
    localStorageService.set(CHECKOUT_STORAGE_KEYS.TOKEN, data.token);
    localStorageService.set(CHECKOUT_STORAGE_KEYS.CUSTOMER_TOKEN, data.token);
    localStorageService.set(CHECKOUT_STORAGE_KEYS.PRICE_ID, data.priceId);
    localStorageService.set(CHECKOUT_STORAGE_KEYS.MOBILE_TOKEN, data.mobileToken);
  },

  getMobileCheckoutData: (): MobileCheckoutData | null => {
    const customerId = localStorageService.get(CHECKOUT_STORAGE_KEYS.CUSTOMER_ID);
    const token = localStorageService.get(CHECKOUT_STORAGE_KEYS.CUSTOMER_TOKEN);
    const priceId = localStorageService.get(CHECKOUT_STORAGE_KEYS.PRICE_ID);
    const mobileToken = localStorageService.get(CHECKOUT_STORAGE_KEYS.MOBILE_TOKEN);

    if (!customerId || !token || !priceId || !mobileToken) {
      return null;
    }

    return { customerId, token, priceId, mobileToken };
  },

  getCurrency: (): string => {
    return localStorageService.get(CHECKOUT_STORAGE_KEYS.CURRENCY) ?? 'eur';
  },

  clearCheckoutData: (): void => {
    Object.values(CHECKOUT_STORAGE_KEYS).forEach((key) => {
      localStorageService.removeItem(key);
    });
  },
};

export { CHECKOUT_STORAGE_KEYS, checkoutStorageService };
export default checkoutStorageService;
