import axios from 'axios';
import { v4 as uuidV4 } from 'uuid';
import dayjs from 'dayjs';
import { getCookie } from './utils';
import errorService from 'app/core/services/error.service';
import localStorageService from 'app/core/services/local-storage.service';
import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import envService from 'app/core/services/env.service';
import { PriceWithTax } from '@internxt/sdk/dist/payments/types';
import { CouponCodeData } from 'app/payment/types';
import { bytesToString } from 'app/drive/services/size.service';
import { getProductAmount } from 'app/payment/utils/getProductAmount';
import { sendAddShoppersConversion } from './addShoppers.services';

/**
 * Stores relevant payment data in local storage to be retrieved later,
 * particularly after a successful checkout (e.g., in CheckoutSuccessView).
 * This enables tracking and analytics with accurate purchase context.
 *
 * Depending on the type of plan (subscription vs lifetime), the function stores:
 * - `subscriptionId` for subscription-based plans (non-lifetime)
 * - `paymentIntentId` for lifetime plans
 *
 * Additionally, it stores metadata such as product name, amount paid, price ID, and currency.
 * The `amountPaid` value is computed based on:
 * - The raw price (pre-tax and before any discounts)
 * - Number of users
 * - Coupon code data (if any)
 *
 * @param subscriptionId - Stripe subscription ID (only for recurring plans)
 * @param paymentIntentId - Stripe payment intent ID (only for lifetime plans)
 * @param selectedPlan - The pricing plan selected by the user
 * @param users - Number of users for the purchase (1 for individual, >1 for B2B)
 * @param couponCodeData - Optional coupon code information applied to the purchase
 * @param email - Email introduced by the user who makes the purchase
 */
export function savePaymentDataInLocalStorage(
  subscriptionId: string | undefined,
  paymentIntentId: string | undefined,
  selectedPlan: PriceWithTax | undefined,
  users: number,
  couponCodeData: CouponCodeData | undefined,
) {
  if (subscriptionId && selectedPlan?.price.interval !== 'lifetime')
    localStorageService.set('subscriptionId', subscriptionId);
  if (paymentIntentId && selectedPlan?.price.interval === 'lifetime')
    localStorageService.set('paymentIntentId', paymentIntentId);
  if (selectedPlan) {
    const planName = bytesToString(selectedPlan.price.bytes) + selectedPlan.price.interval;
    const amountToPay = getProductAmount(selectedPlan.price.decimalAmount, users, couponCodeData);

    localStorageService.set('productName', planName);
    localStorageService.set('amountPaid', amountToPay);
    localStorageService.set('priceId', selectedPlan.price.id);
    localStorageService.set('currency', selectedPlan.price.currency);
  }
  if (couponCodeData?.codeName !== undefined) {
    localStorageService.set('couponCode', couponCodeData.codeName);
  }
}

export async function trackSignUp(uuid: string) {
  try {
    const gclid = getCookie('gclid');
    const IMPACT_API = envService.getVariable('impactApiUrl');
    const anonymousID = getCookie('impactAnonymousId');
    const source = getCookie('impactSource');

    window.gtag('event', 'User Signup');

    if (source && source !== 'direct') {
      await axios.post(IMPACT_API, {
        anonymousId: anonymousID,
        timestamp: dayjs().format('YYYY-MM-DDTHH:mm:ss.sssZ'),
        messageId: uuidV4(),
        userId: uuid,
        type: 'track',
        event: 'User Signup',
        ...(gclid ? { gclid } : {}),
      });
    }
  } catch (e) {
    const castedError = errorService.castError(e);
    errorService.reportError(castedError);
  }
}

export async function trackPaymentConversion() {
  try {
    const { uuid } = localStorageService.getUser() as UserSettings;
    const userSettings = localStorageService.getUser() as UserSettings;

    const subscription = localStorageService.get('subscriptionId');
    const paymentIntent = localStorageService.get('paymentIntentId');
    const productName = localStorageService.get('productName');
    const priceId = localStorageService.get('priceId');
    const currency = localStorageService.get('currency');
    const amount = parseFloat(localStorageService.get('amountPaid') ?? '0');
    const userEmail = userSettings.email;
    const couponCode = localStorageService.get('couponCode') ?? undefined;
    const gclid = getCookie('gclid');

    try {
      window.gtag('event', 'purchase', {
        transaction_id: uuidV4(),
        value: amount,
        currency: currency?.toUpperCase() ?? '€',
        items: [
          {
            item_id: priceId,
            item_name: productName,
            quantity: 1,
            price: amount,
          },
        ],
        ...(gclid ? { gclid } : {}),
      });
    } catch {
      //
    }

    sendAddShoppersConversion({
      orderId: uuid,
      value: amount,
      currency: currency ?? 'EUR',
      couponCodeName: couponCode,
      email: userEmail,
    });

    const IMPACT_API = envService.getVariable('impactApiUrl');
    const anonymousID = getCookie('impactAnonymousId');
    const source = getCookie('impactSource');

    if ((source && source !== 'direct') || couponCode) {
      await axios
        .post(IMPACT_API, {
          anonymousId: anonymousID,
          timestamp: dayjs().format('YYYY-MM-DDTHH:mm:ss.sssZ'),
          properties: {
            impact_value: amount === 0 ? 0.01 : amount,
            subscription_id: subscription,
            payment_intent: paymentIntent,
            ...(couponCode ? { order_promo_code: couponCode } : {}),
          },
          userId: uuid,
          type: 'track',
          event: 'Payment Conversion',
        })
        .catch((err) => {
          const error = errorService.castError(err);
          errorService.reportError(error);
        });
    }
  } catch {
    //
  }
}
