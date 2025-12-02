import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import { v4 as uuidV4 } from 'uuid';
import localStorageService from 'services/local-storage.service';

const canTrack = () => {
  return typeof globalThis !== 'undefined' && globalThis.window.fbq;
};

export const trackLead = (email: string, userID: string) => {
  if (!canTrack()) return;

  globalThis.window.dataLayer.push({
    event: 'leadSuccessful',
    eventCategory: 'User',
    eventAction: 'registration_complete',
    userEmail: email,
    userID: userID,
  });
};

export const trackPurchase = () => {
  if (!canTrack() || !globalThis.window.fbq) return;

  try {
    const amountPaid = localStorageService.get('amountPaid');
    const currency = localStorageService.get('currency');
    const productName = localStorageService.get('productName');
    const priceId = localStorageService.get('priceId');

    const subscription = localStorageService.get('subscriptionId');
    const paymentIntent = localStorageService.get('paymentIntentId');

    const transactionId = paymentIntent || subscription || uuidV4();

    const userSettings = localStorageService.getUser() as UserSettings | null;
    const email = userSettings?.email;
    const uuid = userSettings?.uuid;

    if (!amountPaid || !currency) {
      return;
    }

    const value = Number.parseFloat(amountPaid);

    globalThis.window.fbq(
      'track',
      'Purchase',
      {
        value: value,
        currency: currency,
        content_name: productName,
        content_ids: priceId ? [priceId] : [],
        content_type: 'product',
        user_email: email,
        external_id: uuid,
      },
      { eventID: transactionId },
    );
  } catch (error) {
    console.error('Meta Pixel error:', error);
  }
};
