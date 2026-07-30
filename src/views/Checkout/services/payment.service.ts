import {
  CustomerBillingInfo,
  DisplayPrice,
  Invoice,
  InvoicePayload,
  PaymentMethod,
  RedeemCodePayload,
  UserSubscription,
  UserType,
} from '@internxt/sdk/dist/drive/payments/types/types';
import { RedirectToCheckoutServerOptions, Source, Stripe, StripeError } from '@stripe/stripe-js';
import { loadStripe } from '@stripe/stripe-js/pure';
import { SdkFactory } from 'app/core/factory/sdk';
import envService from 'services/env.service';
import { LifetimeTier, StripeSessionMode } from '../types';

export interface CreatePaymentSessionPayload {
  test?: boolean;
  lifetime_tier?: LifetimeTier;
  mode: StripeSessionMode;
  priceId: string;
  successUrl?: string;
  canceledUrl?: string;
}

let stripe: Stripe;

const paymentService = {
  async getStripe(): Promise<Stripe> {
    if (!stripe) {
      stripe = (await loadStripe(
        envService.isProduction()
          ? envService.getVariable('stripePublicKey')
          : envService.getVariable('stripeTestPublicKey'),
      )) as Stripe;
    }

    return stripe;
  },

  async createSetupIntent(userType?: UserType): Promise<{ clientSecret: string }> {
    const paymentsClient = await SdkFactory.getNewApiInstance().createPaymentsClient();
    return paymentsClient.getSetupIntent(userType);
  },

  async getDefaultPaymentMethod(userType?: UserType): Promise<PaymentMethod | Source> {
    const paymentsClient = await SdkFactory.getNewApiInstance().createPaymentsClient();
    return paymentsClient.getDefaultPaymentMethod(userType);
  },

  async getInvoices(payload: InvoicePayload): Promise<Invoice[]> {
    const paymentsClient = await SdkFactory.getNewApiInstance().createPaymentsClient();
    return paymentsClient.getInvoices(payload);
  },

  async redirectToCheckout(options: RedirectToCheckoutServerOptions): Promise<{ error: StripeError }> {
    const stripe = await this.getStripe();

    return stripe.redirectToCheckout(options);
  },

  async getUserSubscription(userType?: UserType): Promise<UserSubscription> {
    const paymentsClient = await SdkFactory.getNewApiInstance().createPaymentsClient();
    return paymentsClient.getUserSubscription(userType);
  },

  async getPrices(currency?: string, userType?: UserType): Promise<DisplayPrice[]> {
    const paymentsClient = await SdkFactory.getNewApiInstance().createPaymentsClient();
    return paymentsClient.getPrices(currency, userType);
  },

  async getPromoCodesUsedByUser(): Promise<{
    usedCoupons: string[];
  }> {
    const paymentsClient = await SdkFactory.getNewApiInstance().createPaymentsClient();
    return paymentsClient.getPromoCodesUsedByUser();
  },

  async redeemCode(payload: RedeemCodePayload): Promise<void> {
    const paymentsClient = await SdkFactory.getNewApiInstance().createPaymentsClient();
    return paymentsClient.applyRedeemCode({
      code: payload.code,
      provider: payload.provider,
    });
  },

  async updateSubscriptionPrice({
    priceId,
    coupon,
    userType,
  }: {
    priceId: string;
    coupon?: string;
    userType: UserType.Individual | UserType.Business;
  }): Promise<{ userSubscription: UserSubscription; request3DSecure: boolean; clientSecret: string }> {
    const paymentsClient = await SdkFactory.getNewApiInstance().createPaymentsClient();

    return paymentsClient.updateSubscriptionPrice({ priceId, couponCode: coupon, userType });
  },

  async updateSubscriptionWithConfirmation({
    priceId,
    userType,
    coupon,
    onSuccess,
    onError,
  }: {
    priceId: string;
    userType: UserType.Individual | UserType.Business;
    coupon?: string;
    onSuccess: () => void;
    onError: (error: Error) => void;
  }): Promise<void> {
    const stripe = await this.getStripe();
    const updatedSubscription = await this.updateSubscriptionPrice({ priceId, coupon, userType });

    if (updatedSubscription.request3DSecure) {
      const result = await stripe.confirmCardPayment(updatedSubscription.clientSecret);
      if (result?.error?.message) {
        onError(new Error(result.error.message));
      } else {
        onSuccess();
      }
    } else {
      onSuccess();
    }
  },

  async updateWorkspaceMembers(workspaceId: string, subscriptionId: string, updatedMembers: number) {
    const paymentsClient = await SdkFactory.getNewApiInstance().createPaymentsClient();
    return paymentsClient.updateWorkspaceMembers(workspaceId, subscriptionId, updatedMembers);
  },

  async cancelSubscription(userType?: UserType): Promise<void> {
    const paymentsClient = await SdkFactory.getNewApiInstance().createPaymentsClient();

    return paymentsClient.cancelSubscription(userType);
  },

  async applyCancellationTrial(): Promise<void> {
    const paymentsClient = await SdkFactory.getNewApiInstance().createPaymentsClient();
    return paymentsClient.applyCancellationTrial();
  },

  async cancelSubscriptionEarly(): Promise<{ clientSecret: string }> {
    const paymentsClient = await SdkFactory.getNewApiInstance().createPaymentsClient();
    const { clientSecret } = await paymentsClient.cancelSubscriptionEarly();

    return { clientSecret };
  },

  async reactivateUserSubscription(): Promise<void> {
    const paymentsClient = await SdkFactory.getNewApiInstance().createPaymentsClient();
    return paymentsClient.reactivateUserSubscription();
  },

  async updateCustomerBillingInfo(payload: CustomerBillingInfo): Promise<void> {
    const paymentsClient = await SdkFactory.getNewApiInstance().createPaymentsClient();
    return paymentsClient.updateCustomerBillingInfo(payload);
  },
};

export default paymentService;
