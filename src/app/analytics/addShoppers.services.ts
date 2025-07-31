declare global {
  interface Window {
    dataLayer: Record<string, any>[];
  }
}

export function sendAddShoppersConversion({
  orderId,
  value,
  currency,
  couponCodeData,
  email,
}: {
  orderId: string | undefined;
  value: number;
  currency: string | undefined;
  couponCodeData: string | undefined;
  email: string | undefined;
}) {
  const isMissingRequiredFields = !orderId || !value || !currency || !couponCodeData || !email;
  const isInvalidOfferCode = couponCodeData?.toLowerCase() !== 'welcome';

  if (isMissingRequiredFields || isInvalidOfferCode) return;
  try {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: 'addshoppers_conversion',
      order_id: orderId,
      value,
      currency: currency.toUpperCase(),
      email,
      offer_code: couponCodeData,
    });
  } catch {
    //
  }
}
