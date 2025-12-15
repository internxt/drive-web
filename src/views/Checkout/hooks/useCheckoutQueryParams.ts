export const useCheckoutQueryParams = () => {
  const params = new URLSearchParams(globalThis.location.search);

  return {
    planId: params.get('planId'),
    promotionCode: params.get('couponCode'),
    currency: params.get('currency'),
    paramMobileToken: params.get('mobileToken'),
    gclid: params.get('gclid') ?? '',
  };
};
