export function sendAddShoppersConversion({
  orderId,
  value,
  currency,
  offerCode = '',
}: {
  orderId: string;
  value: number;
  currency: string;
  offerCode?: string;
}) {
  const isMissingRequiredFields = !orderId || !value || !currency;
  const isInvalidOfferCode = offerCode.toLowerCase() !== 'welcome';

  if (isMissingRequiredFields) return;

  try {
    (window as any).AddShoppersConversion = {
      order_id: orderId,
      value: value,
      currency: currency.toUpperCase(),
      offer_code: offerCode,
    };

    if (!document.getElementById('AddShoppers')) {
      const script = document.createElement('script');
      script.type = 'text/javascript';
      script.async = true;
      script.id = 'AddShoppers';
      script.src = 'https://shop.pe/widget/widget_async.js#686e92fe5eacb3be0df9b1d8';

      document.head.appendChild(script);
    }
  } catch {
    //
  }
}
