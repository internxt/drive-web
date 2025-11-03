import {
  CreatedSubscriptionData,
  CustomerBillingInfo,
  DisplayPrice,
  FreeTrialAvailable,
  Invoice,
  InvoicePayload,
  PaymentMethod,
  RedeemCodePayload,
  UserSubscription,
  UserType,
} from '@internxt/sdk/dist/drive/payments/types/types';
import { RedirectToCheckoutServerOptions, Source, Stripe, StripeError } from '@stripe/stripe-js';
import { loadStripe } from '@stripe/stripe-js/pure';
import axios from 'axios';
import { SdkFactory } from 'app/core/factory/sdk';
import envService from 'app/core/services/env.service';
import localStorageService from 'app/core/services/local-storage.service';
import { LifetimeTier, StripeSessionMode } from '../types';

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

export interface ValidateCheckoutSessionResponse {
  valid: boolean;
  customerId?: string;
  planId: string;
  userType?: UserType;
  message?: string;
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

  async getCustomerId(
    name: string,
    email: string,
    country?: string,
    companyVatId?: string,
  ): Promise<{ customerId: string; token: string }> {
    const paymentsClient = await SdkFactory.getNewApiInstance().createPaymentsClient();
    return paymentsClient.createCustomer(name, email, country, companyVatId);
  },

  async createSubscription(
    customerId: string,
    priceId: string,
    token: string,
    currency: string,
    promoCode?: string,
    seats = 1,
  ): Promise<CreatedSubscriptionData> {
    const paymentsClient = await SdkFactory.getNewApiInstance().createPaymentsClient();
    return paymentsClient.createSubscription(customerId, priceId, token, seats, currency, promoCode);
  },

  async createPaymentIntent(
    customerId: string,
    amount: number,
    planId: string,
    token: string,
    currency?: string,
    promoCode?: string,
  ): Promise<{ clientSecret: string; id: string; invoiceStatus?: string }> {
    const paymentsClient = await SdkFactory.getNewApiInstance().createPaymentsClient();
    return paymentsClient.createPaymentIntent(customerId, amount, planId, token, currency, promoCode);
  },

  async createSession(payload: CreatePaymentSessionPayload): Promise<{ id: string }> {
    const paymentsClient = await SdkFactory.getNewApiInstance().createPaymentsClient();
    return paymentsClient.createSession(payload);
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

  async isCouponUsedByUser(couponCode: string): Promise<{
    couponUsed: boolean;
  }> {
    const paymentsClient = await SdkFactory.getNewApiInstance().createPaymentsClient();
    return paymentsClient.isCouponUsedByUser({ couponCode: couponCode });
  },

  async getPromoCodesUsedByUser(): Promise<{
    usedCoupons: string[];
  }> {
    const paymentsClient = await SdkFactory.getNewApiInstance().createPaymentsClient();
    return paymentsClient.getPromoCodesUsedByUser();
  },

  async requestPreventCancellation(): Promise<FreeTrialAvailable> {
    const paymentsClient = await SdkFactory.getNewApiInstance().createPaymentsClient();
    return paymentsClient.requestPreventCancellation();
  },

  async preventCancellation(): Promise<void> {
    const paymentsClient = await SdkFactory.getNewApiInstance().createPaymentsClient();
    return paymentsClient.preventCancellation();
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

  async updateWorkspaceMembers(workspaceId: string, subscriptionId: string, updatedMembers: number) {
    const paymentsClient = await SdkFactory.getNewApiInstance().createPaymentsClient();
    return paymentsClient.updateWorkspaceMembers(workspaceId, subscriptionId, updatedMembers);
  },

  async cancelSubscription(userType?: UserType): Promise<void> {
    const paymentsClient = await SdkFactory.getNewApiInstance().createPaymentsClient();

    return paymentsClient.cancelSubscription(userType);
  },

  async updateCustomerBillingInfo(payload: CustomerBillingInfo): Promise<void> {
    const paymentsClient = await SdkFactory.getNewApiInstance().createPaymentsClient();
    return paymentsClient.updateCustomerBillingInfo(payload);
  },

  async createSubscriptionWithTrial(
    customerId: string,
    priceId: string,
    token: string,
    mobileToken: string,
    currency?: string,
  ): Promise<CreatedSubscriptionData> {
    try {
      const newToken = localStorageService.get('xNewToken');

      if (!newToken) {
        throw new Error('No authentication token available');
      }
      const PAYMENTS_API_URL = envService.getVariable('payments');
      const response = await axios.post<CreatedSubscriptionData>(
        `${PAYMENTS_API_URL}/create-subscription-with-trial?trialToken=${mobileToken}`,
        {
          customerId,
          priceId,
          currency,
          token,
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
  },
};

export default paymentService;
