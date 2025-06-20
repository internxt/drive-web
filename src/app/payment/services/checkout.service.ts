import {
  CreatedPaymentIntent,
  CreatedSubscriptionData,
  DisplayPrice,
  UserType,
} from '@internxt/sdk/dist/drive/payments/types/types';
import paymentService from '../../payment/services/payment.service';
import { ClientSecretData, CouponCodeData } from '../types';
import axios from 'axios';
import localStorageService from 'app/core/services/local-storage.service';
import { SdkFactory } from 'app/core/factory/sdk';
import {
  CreatePaymentIntentPayload,
  CreateSubscriptionPayload,
  GetPriceByIdPayload,
  PriceWithTax,
} from '@internxt/sdk/dist/payments/types';
import envService from 'app/core/services/env.service';

const PAYMENTS_API_URL = envService.getVaribale('payments');
const BORDER_SHADOW = 'rgb(0 102 255)';

const fetchPromotionCodeByName = async (priceId: string, promotionCodeName: string): Promise<CouponCodeData> => {
  const response = await fetch(
    `${PAYMENTS_API_URL}/promo-code-by-name?priceId=${priceId}&promotionCode=${promotionCodeName}`,
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

const getCustomerId = async ({
  customerName,
  countryCode,
  postalCode,
  vatId,
}: {
  customerName: string;
  countryCode: string;
  postalCode: string;
  vatId?: string;
}): Promise<{
  customerId: string;
  token: string;
}> => {
  const checkoutClient = await SdkFactory.getInstance().createCheckoutClient();
  return checkoutClient.getCustomerId({
    customerName,
    country: countryCode,
    postalCode,
    companyVatId: vatId,
  });
};

const getPriceById = async ({
  priceId,
  promoCodeName,
  userAddress,
  currency,
  postalCode,
  country,
}: GetPriceByIdPayload): Promise<PriceWithTax> => {
  const checkoutClient = await SdkFactory.getInstance().createCheckoutClient();
  return checkoutClient.getPriceById({
    priceId,
    userAddress,
    promoCodeName,
    currency,
    postalCode,
    country,
  });
};

const createSubscription = async ({
  customerId,
  priceId,
  token,
  currency,
  promoCodeId,
  quantity,
}: CreateSubscriptionPayload): Promise<CreatedSubscriptionData> => {
  const checkoutClient = await SdkFactory.getInstance().createCheckoutClient();
  return checkoutClient.createSubscription({
    customerId,
    priceId,
    token,
    currency,
    promoCodeId,
    quantity,
  });
};

export const createPaymentIntent = async ({
  customerId,
  priceId,
  token,
  currency,
  promoCodeId,
}: CreatePaymentIntentPayload): Promise<CreatedPaymentIntent> => {
  const checkoutClient = await SdkFactory.getInstance().createCheckoutClient();
  return checkoutClient.createPaymentIntent({
    customerId,
    priceId,
    token,
    currency,
    promoCodeId,
  });
};

const fetchPrices = async (userType: UserType, currency: string): Promise<DisplayPrice[]> => {
  const response = await fetch(`${PAYMENTS_API_URL}/prices?userType=${userType}&currency=${currency}`);

  if (response.status !== 200) {
    const message = await response.text();
    throw new Error(message);
  }

  const dataJson = await response.json();

  return dataJson;
};

const getClientSecretForPaymentIntent = async ({
  customerId,
  priceId,
  token,
  currency,
  promoCode,
}: {
  customerId: string;
  priceId: string;
  token: string;
  currency: string;
  promoCode?: string;
}): Promise<ClientSecretData & { paymentIntentId: string; invoiceStatus?: string }> => {
  const {
    clientSecret: client_secret,
    id,
    invoiceStatus,
  } = await createPaymentIntent({ customerId, priceId, token, currency, promoCodeId: promoCode });

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
  mobileToken,
  currency,
  promoCodeId,
  seatsForBusinessSubscription = 1,
}: {
  customerId: string;
  priceId: string;
  token: string;
  mobileToken: string | null;
  currency: string;
  seatsForBusinessSubscription?: number;
  promoCodeId?: string;
}): Promise<ClientSecretData & { subscriptionId?: string; paymentIntentId?: string }> => {
  if (mobileToken) {
    const {
      type: paymentType,
      clientSecret: client_secret,
      subscriptionId,
      paymentIntentId,
    } = await paymentService.createSubscriptionWithTrial(customerId, priceId, token, mobileToken, currency);

    return {
      clientSecretType: paymentType,
      client_secret,
      subscriptionId,
      paymentIntentId,
    };
  }

  const {
    type: paymentType,
    clientSecret: client_secret,
    subscriptionId,
    paymentIntentId,
  } = await checkoutService.createSubscription({
    customerId,
    priceId,
    token,
    currency,
    promoCodeId,
    quantity: seatsForBusinessSubscription,
  });

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
  mobileToken,
  customerId,
  promoCodeId,
  seatsForBusinessSubscription = 1,
}: {
  selectedPlan: PriceWithTax;
  token: string;
  mobileToken: string | null;
  customerId: string;
  promoCodeId?: CouponCodeData['codeId'];
  seatsForBusinessSubscription?: number;
}) => {
  if (selectedPlan?.price.interval === 'lifetime') {
    const { clientSecretType, client_secret, paymentIntentId, invoiceStatus } =
      await checkoutService.getClientSecretForPaymentIntent({
        customerId,
        priceId: selectedPlan.price.id,
        token,
        currency: selectedPlan.price.currency,
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
      priceId: selectedPlan.price?.id,
      token,
      mobileToken,
      currency: selectedPlan.price.currency,
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

const checkoutSetupIntent = async (customerId: string) => {
  try {
    const newToken = localStorageService.get('xNewToken');

    if (!newToken) {
      throw new Error('No authentication token available');
    }
    const response = await axios.post<{ clientSecret: string }>(
      `${PAYMENTS_API_URL}/setup-intent`,
      {
        customerId,
      },
      {
        headers: {
          Authorization: `Bearer ${newToken}`,
          'Content-Type': 'application/json',
        },
      },
    );

    return response.data;
  } catch (error) {
    throw new Error('Error creating subscription with trial');
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
  plan: PriceWithTax,
) => {
  const { backgroundColor, textColor, borderColor, borderInputColor, labelTextColor } = theme;

  return {
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
    mode: plan.price?.interval === 'lifetime' ? 'payment' : 'subscription',
    amount: plan.taxes?.amountWithTax,
    currency: plan.price?.currency,
    payment_method_types: ['card', 'paypal'],
  };
};

const checkoutService = {
  fetchPromotionCodeByName,
  getClientSecretForPaymentIntent,
  getClientSecretForSubscriptionIntent,
  getClientSecret,
  getCustomerId,
  createPaymentIntent,
  getPriceById,
  createSubscription,
  loadStripeElements,
  fetchPrices,
  checkoutSetupIntent,
};

export default checkoutService;
