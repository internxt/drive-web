import { StripeElementsOptions } from '@stripe/stripe-js';
import paymentService from '../../payment/services/payment.service';
import { ClientSecretData, CouponCodeData, PlanData, RequestedPlanData } from '../types';
import envService from '../../core/services/env.service';
import { DisplayPrice, UserType } from '@internxt/sdk/dist/drive/payments/types';

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

const fetchPrices = async (userType: UserType, currency: string): Promise<DisplayPrice[]> => {
  const response = await fetch(
    `${process.env.REACT_APP_PAYMENTS_API_URL}/prices?userType=${userType}&currency=${currency}`,
  );

  if (response.status !== 200) {
    const message = await response.text();
    throw new Error(message);
  }

  const dataJson = await response.json();

  return dataJson;
};

const getClientSecretForPaymentIntent = async ({
  customerId,
  amount,
  priceId,
  token,
  currency,
  promoCode,
}: {
  customerId: string;
  amount: number;
  priceId: string;
  token: string;
  currency: string;
  promoCode?: string;
}): Promise<ClientSecretData & { paymentIntentId: string; invoiceStatus?: string }> => {
  const {
    clientSecret: client_secret,
    id,
    invoiceStatus,
  } = await paymentService.createPaymentIntent(customerId, amount, priceId, token, currency, promoCode);

  return {
    clientSecretType: 'payment',
    client_secret,
    paymentIntentId: id,
    invoiceStatus: invoiceStatus,
  };
};

const getClientSecretForSubscriptionIntent = async ({
  customerId,
  priceId,
  token,
  currency,
  promoCodeId,
  seatsForBusinessSubscription = 1,
}: {
  customerId: string;
  priceId: string;
  token: string;
  currency: string;
  seatsForBusinessSubscription?: number;
  promoCodeId?: string;
}): Promise<ClientSecretData & { subscriptionId?: string; paymentIntentId?: string }> => {
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
    promoCodeId,
    seatsForBusinessSubscription,
  );

  return {
    clientSecretType: paymentType,
    client_secret,
    subscriptionId,
    paymentIntentId,
  };
};

const getClientSecret = async ({
  selectedPlan,
  token,
  customerId,
  promoCodeId,
  seatsForBusinessSubscription = 1,
}: {
  selectedPlan: RequestedPlanData;
  token: string;
  customerId: string;
  promoCodeId?: CouponCodeData['codeId'];
  seatsForBusinessSubscription?: number;
}) => {
  if (selectedPlan?.interval === 'lifetime') {
    const { clientSecretType, client_secret, paymentIntentId, invoiceStatus } =
      await checkoutService.getClientSecretForPaymentIntent({
        customerId,
        amount: selectedPlan.amount,
        priceId: selectedPlan.id,
        token,
        currency: selectedPlan.currency,
        promoCode: promoCodeId,
      });

    return {
      type: clientSecretType,
      clientSecret: client_secret,
      paymentIntentId,
      invoiceStatus,
    };
  } else {
    const response = await checkoutService.getClientSecretForSubscriptionIntent({
      customerId,
      priceId: selectedPlan?.id,
      token,
      currency: selectedPlan.currency,
      seatsForBusinessSubscription,
      promoCodeId,
    });

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
  fetchPrices,
};

export default checkoutService;
