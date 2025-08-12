import { CreatedSubscriptionData, DisplayPrice, UserType } from '@internxt/sdk/dist/drive/payments/types/types';
import { CouponCodeData } from '../types';
import axios from 'axios';
import localStorageService from 'app/core/services/local-storage.service';
import { SdkFactory } from 'app/core/factory/sdk';
import {
  CreatePaymentIntentPayload,
  CreateSubscriptionPayload,
  GetPriceByIdPayload,
  PaymentIntent,
  PaymentIntentCrypto,
  PriceWithTax,
} from '@internxt/sdk/dist/payments/types';
import envService from 'app/core/services/env.service';

const BORDER_SHADOW = 'rgb(0 102 255)';

const fetchPromotionCodeByName = async (priceId: string, promotionCodeName: string): Promise<CouponCodeData> => {
  const PAYMENTS_API_URL = envService.getVariable('payments');
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
  const checkoutClient = await SdkFactory.getNewApiInstance().createCheckoutClient();
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
  const checkoutClient = await SdkFactory.getNewApiInstance().createCheckoutClient();
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
  const checkoutClient = await SdkFactory.getNewApiInstance().createCheckoutClient();
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
}: CreatePaymentIntentPayload): Promise<PaymentIntent> => {
  const checkoutClient = await SdkFactory.getNewApiInstance().createCheckoutClient();
  return checkoutClient.createPaymentIntent({
    customerId,
    priceId,
    token,
    currency,
    promoCodeId,
  });
};

const fetchPrices = async (userType: UserType, currency: string): Promise<DisplayPrice[]> => {
  const PAYMENTS_API_URL = envService.getVariable('payments');
  const response = await fetch(`${PAYMENTS_API_URL}/prices?userType=${userType}&currency=${currency}`);

  if (response.status !== 200) {
    const message = await response.text();
    throw new Error(message);
  }

  const dataJson = await response.json();

  return dataJson;
};

const checkoutSetupIntent = async (customerId: string) => {
  try {
    const newToken = localStorageService.get('xNewToken');

    if (!newToken) {
      throw new Error('No authentication token available');
    }
    const PAYMENTS_API_URL = envService.getVariable('payments');
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

const verifyCryptoPayment = async (token: PaymentIntentCrypto['token']): Promise<boolean> => {
  const checkoutClient = await SdkFactory.getNewApiInstance().createCheckoutClient();
  return checkoutClient.verifyCryptoPayment(token);
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
  getCustomerId,
  createPaymentIntent,
  getPriceById,
  createSubscription,
  loadStripeElements,
  fetchPrices,
  checkoutSetupIntent,
};

export default checkoutService;
