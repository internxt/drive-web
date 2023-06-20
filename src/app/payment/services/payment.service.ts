import { generateMnemonic } from 'bip39';
import { encryptPGP } from '../../crypto/services/utilspgp';
import httpService from '../../core/services/http.service';
import envService from '../../core/services/env.service';
import { LifetimeTier, StripeSessionMode } from '../types';
import { loadStripe } from '@stripe/stripe-js/pure';
import { RedirectToCheckoutServerOptions, Stripe, StripeError } from '@stripe/stripe-js';
import { SdkFactory } from '../../core/factory/sdk';
import {
  CreateCheckoutSessionPayload,
  DisplayPrice,
  Invoice,
  PaymentMethod,
  UserSubscription,
  FreeTrialAvailable,
  RedeemCodePayload,
} from '@internxt/sdk/dist/drive/payments/types';

export interface CreatePaymentSessionPayload {
  test?: boolean;
  lifetime_tier?: LifetimeTier;
  mode: StripeSessionMode;
  priceId: string;
  successUrl?: string;
  canceledUrl?: string;
}

export interface CreateTeamsPaymentSessionPayload {
  test?: boolean;
  mode: StripeSessionMode;
  priceId: string;
  quantity: number;
  mnemonicTeam: string;
  successUrl?: string;
  canceledUrl?: string;
}

let stripe: Stripe;

const paymentService = {
  async getStripe(): Promise<Stripe> {
    if (!stripe) {
      stripe = (await loadStripe(
        envService.isProduction() ? process.env.REACT_APP_STRIPE_PK : process.env.REACT_APP_STRIPE_TEST_PK,
      )) as Stripe;
    }

    return stripe;
  },

  async createSession(payload: CreatePaymentSessionPayload): Promise<{ id: string }> {
    const paymentsClient = await SdkFactory.getInstance().createPaymentsClient();
    return paymentsClient.createSession(payload);
  },

  async createSetupIntent(): Promise<{ clientSecret: string }> {
    const paymentsClient = await SdkFactory.getInstance().createPaymentsClient();
    return paymentsClient.getSetupIntent();
  },

  async getDefaultPaymentMethod(): Promise<PaymentMethod | any> {
    const paymentsClient = await SdkFactory.getInstance().createPaymentsClient();
    return paymentsClient.getDefaultPaymentMethod();
  },

  async getInvoices(): Promise<Invoice[]> {
    const paymentsClient = await SdkFactory.getInstance().createPaymentsClient();
    return paymentsClient.getInvoices({});
  },

  async redirectToCheckout(options: RedirectToCheckoutServerOptions): Promise<{ error: StripeError }> {
    const stripe = await this.getStripe();

    return stripe.redirectToCheckout(options);
  },

  async getUserSubscription(): Promise<UserSubscription> {
    const paymentsClient = await SdkFactory.getInstance().createPaymentsClient();
    return paymentsClient.getUserSubscription();
  },

  async getPrices(): Promise<DisplayPrice[]> {
    const paymentsClient = await SdkFactory.getInstance().createPaymentsClient();
    return paymentsClient.getPrices();
  },

  async requestPreventCancellation(): Promise<FreeTrialAvailable> {
    const paymentsClient = await SdkFactory.getInstance().createPaymentsClient();
    return paymentsClient.requestPreventCancellation();
  },

  async preventCancellation(): Promise<void> {
    const paymentsClient = await SdkFactory.getInstance().createPaymentsClient();
    return paymentsClient.preventCancellation();
  },

  async redeemCode(payload: RedeemCodePayload): Promise<void> {
    const paymentsClient = await SdkFactory.getInstance().createPaymentsClient();
    return paymentsClient.applyRedeemCode({
      code: payload.code,
      provider: payload.provider,
    });
  },

  async updateSubscriptionPrice(priceId: string): Promise<UserSubscription> {
    const paymentsClient = await SdkFactory.getInstance().createPaymentsClient();

    return paymentsClient.updateSubscriptionPrice(priceId);
  },

  async cancelSubscription(): Promise<void> {
    const paymentsClient = await SdkFactory.getInstance().createPaymentsClient();

    return paymentsClient.cancelSubscription();
  },

  async createCheckoutSession(
    payload: CreateCheckoutSessionPayload & { mode?: string },
  ): Promise<{ sessionId: string }> {
    const paymentsClient = await SdkFactory.getInstance().createPaymentsClient();

    return paymentsClient.createCheckoutSession(payload);
  },

  // TODO: refactor as individual
  async handlePaymentTeams(priceId: string, quantity: number, mode: StripeSessionMode): Promise<void> {
    const mnemonicTeam = generateMnemonic(256);
    const encMnemonicTeam = await encryptPGP(mnemonicTeam);
    const codMnemonicTeam = Buffer.from(encMnemonicTeam.data).toString('base64');
    const payload: CreateTeamsPaymentSessionPayload = {
      mode,
      priceId,
      quantity,
      mnemonicTeam: codMnemonicTeam,
      test: !envService.isProduction(),
    };

    const response = await fetch(`${process.env.REACT_APP_API_URL}/api/stripe/teams/session`, {
      method: 'POST',
      headers: httpService.getHeaders(true, false),
      body: JSON.stringify(payload),
    })
      .then((response) => response.json())
      .catch((err) => {
        console.error('Error starting Stripe session. Reason: %s', err);
        throw err;
      });

    if (response.error) {
      throw Error(response.error);
    }

    const stripe = await this.getStripe();

    await stripe.redirectToCheckout({ sessionId: response.id });
  },
};

export default paymentService;
