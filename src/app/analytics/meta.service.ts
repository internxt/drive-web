/* eslint-disable @typescript-eslint/no-explicit-any */
import localStorageService from 'services/local-storage.service';

const canTrack = () => {
  return typeof globalThis !== 'undefined' && 
         typeof globalThis.window !== 'undefined' &&
         (globalThis.window as any).dataLayer && 
         (globalThis.window as any).fbq;
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

  (globalThis.window as any).fbq('track', 'Lead', {
    content_name: 'User Registration',
    status: 'completed',
  });
};

export const trackPurchase = () => {
  if (!canTrack()) return;

  const amountPaid = localStorageService.get('amountPaid');
  const currency = localStorageService.get('currency');

  if (!amountPaid || !currency) {
    return;
  }

  const value = parseFloat(amountPaid);

  globalThis.window.dataLayer.push({
    event: 'purchaseSuccessful',
    ecommerce: {
      value: value,
      currency: currency,
    },
  });

  (globalThis.window as any).fbq('track', 'Purchase', {
    value: value,
    currency: currency,
    content_type: 'product',
  });
};

const metaService = {
  trackLead,
  trackPurchase,
};

export default metaService;