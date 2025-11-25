import localStorageService from 'app/core/services/local-storage.service';

const canTrack = () => {
  return typeof globalThis !== 'undefined' && (globalThis as any).dataLayer && (globalThis as any).fbq;
};

export const trackLead = (email: string, userID: string) => {
  if (!canTrack()) {
    return;
  }

  globalThis.window.dataLayer.push({
    event: 'leadSuccessful',
    eventCategory: 'User',
    eventAction: 'registration_complete',
    userEmail: email,
    userID: userID,
  });
};

export const trackPurchase = (email: string, userID: string) => {
  if (!canTrack()) return;

  const amountPaid = localStorageService.get('amountPaid');
  const currency = localStorageService.get('currency');

  if (!amountPaid || !currency) {
    return;
  }

  const value = Number.parseFloat(amountPaid);

  globalThis.window.dataLayer.push({
    event: 'purchaseSuccessful',

    ecommerce: {
      value: value,
      currency: currency,
    },

    userEmail: email,
    userID: userID,
  });
};
