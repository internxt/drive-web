import { CreatedSubscriptionData, DisplayPrice, UserType } from '@internxt/sdk/dist/drive/payments/types/types';
import { CouponCodeData } from '../types';
import axios from 'axios';
import localStorageService from 'services/local-storage.service';
import { SdkFactory } from 'app/core/factory/sdk';
import {
  CreateCustomerPayload,
  CreatePaymentIntentPayload,
  CreateSubscriptionPayload,
  GetPriceByIdPayload,
  PaymentIntent,
  PaymentIntentCrypto,
  PriceWithTax,
} from '@internxt/sdk/dist/payments/types';
import envService from 'services/env.service';
import errorService from 'services/error.service';
import { bytesToString } from 'app/drive/services/size.service';

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

const createCustomer = async ({
  customerName,
  city,
  country,
  lineAddress1,
  lineAddress2,
  postalCode,
  captchaToken,
  companyVatId,
}: CreateCustomerPayload): Promise<{
  customerId: string;
  token: string;
}> => {
  const checkoutClient = await SdkFactory.getNewApiInstance().createCheckoutClient();
  return checkoutClient.createCustomer({
    city,
    lineAddress1,
    lineAddress2,
    customerName,
    country,
    postalCode,
    captchaToken,
    companyVatId,
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
  captchaToken,
  promoCodeId,
  quantity,
}: CreateSubscriptionPayload): Promise<CreatedSubscriptionData> => {
  const checkoutClient = await SdkFactory.getNewApiInstance().createCheckoutClient();
  return checkoutClient.createSubscription({
    customerId,
    priceId,
    token,
    currency,
    captchaToken,
    promoCodeId,
    quantity,
  });
};

export const createPaymentIntent = async ({
  customerId,
  priceId,
  token,
  currency,
  captchaToken,
  userAddress,
  promoCodeId,
}: CreatePaymentIntentPayload): Promise<PaymentIntent> => {
  const checkoutClient = await SdkFactory.getNewApiInstance().createCheckoutClient();
  return checkoutClient.createPaymentIntent({
    customerId,
    priceId,
    token,
    currency,
    captchaToken,
    userAddress,
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
    errorService.reportError(error);
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
    payment_method_types:
      plan?.price?.interval === 'lifetime' && plan.price?.currency === 'eur'
        ? ['card', 'paypal', 'klarna']
        : ['card', 'paypal'],
  };
};

const trackIncompleteCheckout = async (selectedPlan: PriceWithTax | undefined, price?: number): Promise<void> => {
  console.log('[trackIncompleteCheckout] Starting...', {
    selectedPlan,
    price,
    hasPriceId: !!selectedPlan?.price?.id,
  });

  try {
    // Validación 1: selectedPlan.price.id
    if (!selectedPlan?.price?.id) {
      console.warn('[trackIncompleteCheckout] Early return: missing selectedPlan.price.id', {
        selectedPlan,
      });
      return;
    }

    console.log('[trackIncompleteCheckout] selectedPlan.price.id exists:', selectedPlan.price.id);

    // Validación 2: bytes e interval
    if (!selectedPlan.price.bytes) {
      console.warn('[trackIncompleteCheckout] Missing selectedPlan.price.bytes', {
        bytes: selectedPlan.price.bytes,
      });
    }

    if (!selectedPlan.price.interval) {
      console.warn('[trackIncompleteCheckout] Missing selectedPlan.price.interval', {
        interval: selectedPlan.price.interval,
      });
    }

    // Validación 3: price
    if (price === undefined || price === null) {
      console.warn('[trackIncompleteCheckout] price is undefined or null', { price });
    }

    const priceId = selectedPlan.price.id;

    console.log('[trackIncompleteCheckout] Converting bytes to string...', {
      bytes: selectedPlan.price.bytes,
    });

    const bytesStr = bytesToString(selectedPlan.price.bytes);
    console.log('[trackIncompleteCheckout] Bytes converted:', bytesStr);

    const planName = `${bytesStr} ${selectedPlan.price.interval}`;
    console.log('[trackIncompleteCheckout] Plan name created:', planName);

    const currentParams = new URLSearchParams(globalThis.location.search);
    console.log('[trackIncompleteCheckout] Current URL params:', currentParams.toString());

    currentParams.set('planId', priceId);
    console.log('[trackIncompleteCheckout] Updated URL params:', currentParams.toString());

    const completeCheckoutUrl = `https://drive.internxt.com/checkout?${currentParams.toString()}`;
    console.log('[trackIncompleteCheckout] Complete checkout URL:', completeCheckoutUrl);

    console.log('[trackIncompleteCheckout] Creating users client...');
    const usersClient = SdkFactory.getNewApiInstance().createUsersClient();
    console.log('[trackIncompleteCheckout] Users client created');

    const payload = {
      completeCheckoutUrl,
      planName,
      price,
    };
    console.log('[trackIncompleteCheckout] Calling handleIncompleteCheckout with payload:', payload);

    const startTime = Date.now();
    await usersClient.handleIncompleteCheckout(payload);
    const endTime = Date.now();

    console.log('[trackIncompleteCheckout] handleIncompleteCheckout completed successfully', {
      duration: `${endTime - startTime}ms`,
    });

    console.log('[trackIncompleteCheckout] Waiting 100ms...');
    await new Promise((resolve) => setTimeout(resolve, 100));

    console.log('[trackIncompleteCheckout] Finished successfully');
  } catch (error) {
    console.error('[trackIncompleteCheckout] Error caught:', {
      error,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      errorStack: error instanceof Error ? error.stack : undefined,
      selectedPlan,
      price,
    });

    errorService.reportError(error);

    // Opcional: re-lanzar el error si es crítico
    // throw error;
  }
};

const checkoutService = {
  fetchPromotionCodeByName,
  createCustomer,
  createPaymentIntent,
  getPriceById,
  createSubscription,
  loadStripeElements,
  fetchPrices,
  checkoutSetupIntent,
  verifyCryptoPayment,
  trackIncompleteCheckout,
};

export default checkoutService;
