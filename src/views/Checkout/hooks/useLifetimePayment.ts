import { Stripe, StripeElements } from '@stripe/stripe-js';
import { PriceWithTax } from '@internxt/sdk/dist/payments/types';
import { savePaymentDataInLocalStorage } from 'app/analytics/impact.service';
import { ActionDialog, DialogActionConfig } from 'app/contexts/dialog-manager/ActionDialogManager.context';
import navigationService from 'services/navigation.service';
import { AppView } from 'app/core/types';
import checkoutService from '../services/checkout.service';
import { useStripeConfirmation } from './useStripeConfirmation';
import { CouponCodeData, InvoiceStatus, PaymentType } from '../types';

interface CreateLifetimeIntentParams {
  customerId: string;
  priceId: string;
  currency: string;
  token: string;
  userAddress: string;
  captchaToken: string;
  promoCodeId?: string;
}

interface LifetimePaymentParams {
  customerId: string;
  priceId: string;
  token: string;
  currency: string;
  userAddress: string;
  captchaToken: string;
  selectedPlan: PriceWithTax;
  couponCodeData?: CouponCodeData;
  elements: StripeElements;
  confirmPayment: Stripe['confirmPayment'];
  openCryptoPaymentDialog?: (key: ActionDialog, config?: DialogActionConfig) => void;
}

interface FiatPaymentIntentResponse {
  id: string;
  type: PaymentType.FIAT;
  clientSecret: string | null;
  invoiceStatus?: string;
}

interface CryptoPaymentIntentResponse {
  id: string;
  type: PaymentType.CRYPTO;
  encodedInvoiceIdToken?: string;
  payload: {
    qrUrl: string;
    paymentRequestUri: string;
    paymentAddress: string;
    payAmount: number;
    payCurrency: string;
    url: string;
  };
}

type LifetimeIntentResponse = FiatPaymentIntentResponse | CryptoPaymentIntentResponse;

export const useLifetimePayment = () => {
  const { confirmPaymentIntent } = useStripeConfirmation();

  const createLifetimeIntent = async ({
    customerId,
    priceId,
    currency,
    token,
    userAddress,
    captchaToken,
    promoCodeId,
  }: CreateLifetimeIntentParams): Promise<LifetimeIntentResponse> => {
    const response = await checkoutService.createPaymentIntent({
      customerId,
      priceId,
      currency,
      userAddress,
      token,
      captchaToken,
      promoCodeId,
    });

    if (response.type === PaymentType.CRYPTO) {
      return {
        id: response.id,
        type: PaymentType.CRYPTO,
        encodedInvoiceIdToken: response.token,
        payload: { ...response.payload },
      };
    }

    return {
      id: response.id,
      type: PaymentType.FIAT,
      clientSecret: response.clientSecret,
      invoiceStatus: response.invoiceStatus,
    };
  };

  const processLifetimePayment = async ({
    customerId,
    priceId,
    token,
    currency,
    userAddress,
    captchaToken,
    selectedPlan,
    couponCodeData,
    elements,
    confirmPayment,
    openCryptoPaymentDialog,
  }: LifetimePaymentParams): Promise<void> => {
    const intentResponse = await createLifetimeIntent({
      customerId,
      priceId,
      token,
      captchaToken,
      promoCodeId: couponCodeData?.codeId,
      userAddress,
      currency,
    });

    savePaymentDataInLocalStorage(undefined, intentResponse.id, selectedPlan, 1, couponCodeData);

    // If 100% OFF coupon, invoice is already paid - redirect to success
    if (intentResponse.type === PaymentType.FIAT && intentResponse.invoiceStatus === InvoiceStatus.PAID) {
      navigationService.push(AppView.CheckoutSuccess);
      return;
    }

    if (intentResponse.type === PaymentType.FIAT && intentResponse.clientSecret) {
      await confirmPaymentIntent({
        elements,
        clientSecret: intentResponse.clientSecret,
        confirmPayment,
      });
    } else if (intentResponse.type === PaymentType.CRYPTO) {
      openCryptoPaymentDialog?.(ActionDialog.CryptoPayment, {
        closeAllDialogsFirst: true,
        data: {
          qrUrl: intentResponse.payload.qrUrl,
          paymentRequestUri: intentResponse.payload.paymentRequestUri,
          encodedInvoiceIdToken: intentResponse.encodedInvoiceIdToken,
          address: intentResponse.payload.paymentAddress,
          payAmount: intentResponse.payload.payAmount,
          payCurrency: intentResponse.payload.payCurrency,
          url: intentResponse.payload.url,
          fiat: {
            amount: selectedPlan.taxes.decimalAmountWithTax,
            currency: selectedPlan.price.currency,
          },
        },
      });
    }
  };

  return {
    createLifetimeIntent,
    processLifetimePayment,
  };
};
