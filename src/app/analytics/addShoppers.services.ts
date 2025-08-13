export function sendAddShoppersConversion({
  orderId,
  value,
  currency,
  couponCodeName,
  email,
}: {
  orderId: string | undefined;
  value: number;
  currency: string | undefined;
  couponCodeName: string | undefined;
  email: string | undefined;
}) {
  const isMissingRequiredFields = !orderId || !value || !currency || !couponCodeName || !email;
  const isInvalidOfferCode = couponCodeName?.toLowerCase() !== 'welcome';

  if (isMissingRequiredFields || isInvalidOfferCode) return;
  try {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: 'addshoppers_conversion',
      order_id: orderId,
      value,
      currency: currency.toUpperCase(),
      email,
      offer_code: couponCodeName,
    });
  } catch {
    //
  }
}
