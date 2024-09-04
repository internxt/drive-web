import { StripeElementsOptions } from '@stripe/stripe-js';
import paymentService from '../../payment/services/payment.service';
import { ClientSecretData, CouponCodeData, PlanData, RequestedPlanData } from '../types';
import envService from '../../core/services/env.service';

const IS_PRODUCTION = envService.isProduction();
const BORDER_SHADOW = 'rgb(0 102 255)';

const fetchPlanById = async (priceId: string, currency?: string): Promise<PlanData> => {
  const response = await fetch(
    `${process.env.REACT_APP_PAYMENTS_API_URL}/plan-by-id?planId=${priceId}&currency=${currency}`,
    {
      method: 'GET',
    },
  );

  if (response.status !== 200) {
    throw new Error('Plan not found');
  }

  const data = await response.json();

  return data;
};

const fetchPromotionCodeByName = async (priceId: string, promotionCodeName: string): Promise<CouponCodeData> => {
  const response = await fetch(
    `${process.env.REACT_APP_PAYMENTS_API_URL}/promo-code-by-name?priceId=${priceId}&promotionCode=${promotionCodeName}`,
  );

  if (response.status !== 200) {
    const message = await response.text();
    throw new Error(message);
  }

  const dataJson = await response.json();

  return {
    codeId: dataJson.codeId,
    codeName: promotionCodeName,
    amountOff: dataJson.amountOff,
    percentOff: dataJson.percentOff,
  };
};

const getClientSecretForPaymentIntent = async (
  customerId: string,
  amount: number,
  planId: string,
  token: string,
  currency: string,
  promoCode?: string,
): Promise<ClientSecretData & { paymentIntentId: string }> => {
  const { clientSecret: client_secret, id } = await paymentService.createPaymentIntent(
    customerId,
    amount,
    planId,
    token,
    currency,
    promoCode,
  );

  return {
    clientSecretType: 'payment',
    client_secret,
    paymentIntentId: id,
  };
};

const getClientSecretForSubscriptionIntent = async (
  customerId: string,
  priceId: string,
  token: string,
  currency: string,
  seatsForBusinessSubscription = 1,
  promoCodeId?: string,
): Promise<ClientSecretData & { subscriptionId?: string; paymentIntentId?: string }> => {
  const {
    type: paymentType,
    clientSecret: client_secret,
    subscriptionId,
    paymentIntentId,
  } = await paymentService.createSubscription(
    customerId,
    priceId,
    token,
    currency,
    seatsForBusinessSubscription,
    promoCodeId,
  );

  return {
    clientSecretType: paymentType,
    client_secret,
    subscriptionId,
    paymentIntentId,
  };
};

const getClientSecret = async (
  selectedPlan: RequestedPlanData,
  token: string,
  customerId: string,
  promoCodeId?: CouponCodeData['codeId'],
  seatsForBusinessSubscription = 1,
) => {
  if (selectedPlan?.interval === 'lifetime') {
    const { clientSecretType, client_secret, paymentIntentId } = await checkoutService.getClientSecretForPaymentIntent(
      customerId,
      selectedPlan.amount,
      selectedPlan.id,
      token,
      selectedPlan.currency,
      promoCodeId,
    );

    return {
      type: clientSecretType,
      clientSecret: client_secret,
      paymentIntentId,
    };
  } else {
    const response = await checkoutService.getClientSecretForSubscriptionIntent(
      customerId,
      selectedPlan?.id,
      token,
      selectedPlan.currency,
      seatsForBusinessSubscription,
      promoCodeId,
    );

    const { clientSecretType, client_secret, subscriptionId, paymentIntentId } = response;
    return {
      type: clientSecretType,
      clientSecret: client_secret,
      subscriptionId,
      paymentIntentId,
    };
  }
};

const loadStripeElements = async (
  theme: {
    backgroundColor: string;
    textColor: string;
    borderColor: string;
    borderInputColor: string;
    labelTextColor: string;
  },
  onLoadElements: (stripeElementsOptions: StripeElementsOptions) => void,
  plan: PlanData,
) => {
  const { backgroundColor, textColor, borderColor, borderInputColor, labelTextColor } = theme;

  const stripeElementsOptions: StripeElementsOptions = {
    appearance: {
      labels: 'above',
      variables: {
        spacingAccordionItem: '8px',
        colorPrimary: textColor,
      },
      theme: 'flat',
      rules: {
        '.AccordionItem:hover': {
          color: textColor,
        },
        '.Block': {
          backgroundColor: backgroundColor,
        },
        '.TermsText': {
          color: textColor,
        },
        '.AccordionItem': {
          borderRadius: '16px',
          borderColor: borderColor,
          border: '1px solid',
          backgroundColor: backgroundColor,
        },
        '.Input': {
          backgroundColor: `${backgroundColor}`,
          borderRadius: '0.375rem',
          color: textColor,
          border: `1px solid ${borderInputColor}`,
        },
        '.Input:focus': {
          backgroundColor: `${backgroundColor}`,
          // borderColor: borderInputColor,
          boxShadow: `0px 0px 4px ${BORDER_SHADOW}`,
          border: `0.5px solid ${BORDER_SHADOW}`,
        },
        '.Input::selection': {
          backgroundColor: `${backgroundColor}`,
          // borderColor: borderInputColor,
          border: `0.5px solid ${BORDER_SHADOW}`,
        },
        '.Label': {
          color: labelTextColor,
          fontSize: '0.875rem',
        },
        '.RedirectText': {
          color: textColor,
        },
      },
    },
    mode: plan?.selectedPlan.interval === 'lifetime' ? 'payment' : 'subscription',
    amount: plan?.selectedPlan.amount,
    currency: plan?.selectedPlan.currency,
    payment_method_types: ['card', 'paypal'],
  };

  onLoadElements(stripeElementsOptions);
};

const checkoutService = {
  fetchPlanById,
  fetchPromotionCodeByName,
  getClientSecretForPaymentIntent,
  getClientSecretForSubscriptionIntent,
  getClientSecret,
  loadStripeElements,
};

export default checkoutService;
