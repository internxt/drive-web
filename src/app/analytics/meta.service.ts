import localStorageService from 'app/core/services/local-storage.service';

const canTrack = () => {
  return typeof window !== 'undefined' && (window as any).dataLayer && (window as any).fbq;
};

export const trackLead = (email: string, userID: string) => {
  if (!canTrack()) {
    return;
  }

  (window as any).dataLayer.push({
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

  const value = parseFloat(amountPaid);

  (window as any).dataLayer.push({
    event: 'purchaseSuccessful',

    ecommerce: {
      value: value,
      currency: currency,
    },

    userEmail: email,
    userID: userID,
  });
};
