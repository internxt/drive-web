import { bytesToString } from 'app/drive/services/size.service';
import { formatPrice } from 'views/Checkout/utils/formatPrice';
import { getProductAmount } from 'views/Checkout/utils/getProductAmount';
import { CouponCodeData } from 'views/Checkout/types';
import envService from 'services/env.service';
import localStorageService from 'services/local-storage.service';
import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';

interface BaseTrackParams {
  planId: string;
  planPrice: number;
  currency: string;
  planType: 'individual' | 'business';
  interval: string;
  storage: string;
  promoCodeId?: string;
  couponCodeData?: CouponCodeData;
  seats?: number;
}

type TrackBeginCheckoutParams = BaseTrackParams;

const GA_ID = envService.getVariable('gaId');
const GA_TAG = envService.getVariable('gaConversionTag');
const SEND_TO = [GA_ID, GA_TAG].filter(Boolean);

if (globalThis.window !== undefined && !globalThis.window.dataLayer) {
  globalThis.window.dataLayer = [];
}

function track(eventName: string, object: Record<string, any>): void {
  try {
    globalThis.window.dataLayer.push({
      event: eventName,
      ...object,
    });
  } catch (error) {
    console.error(error);
  }
}

function capitalizeFirstLetter(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function getPlanCategory(planType: 'individual' | 'business'): string {
  return planType === 'individual' ? 'Individual' : 'Business';
}

function calculateDiscountAmount(originalPrice: number, couponCodeData?: CouponCodeData): number {
  if (!couponCodeData) {
    return 0;
  }
  const finalPriceString = getProductAmount(originalPrice, 1, couponCodeData);
  const finalPrice = Number.parseFloat(finalPriceString);

  if (Number.isNaN(finalPrice)) {
    return 0;
  }
  const discount = originalPrice - finalPrice;
  return Number.parseFloat(formatPrice(Math.max(0, discount)));
}

function buildItem(params: BaseTrackParams) {
  const { planId, planPrice, planType, interval, storage, promoCodeId, couponCodeData, seats = 1 } = params;

  const storageBytes = Number.parseInt(storage, 10);
  const formattedStorage = Number.isNaN(storageBytes) ? storage : bytesToString(storageBytes);
  const discount = calculateDiscountAmount(planPrice, couponCodeData);

  return {
    item_id: planId,
    item_name: `${formattedStorage} ${capitalizeFirstLetter(interval)} Plan`,
    item_category: getPlanCategory(planType),
    item_variant: interval,
    price: Number.parseFloat(formatPrice(planPrice)),
    quantity: seats,
    item_brand: 'Internxt',
    ...(promoCodeId && { coupon: promoCodeId }),
    ...(discount > 0 && { discount }),
  };
}

function trackBeginCheckout(params: TrackBeginCheckoutParams): void {
  const { planPrice, currency, promoCodeId, couponCodeData, seats = 1 } = params;

  const planAmountPerUserString = getProductAmount(planPrice, 1, couponCodeData);
  const planAmountPerUser = Number.parseFloat(planAmountPerUserString);
  const totalAmount = Number.parseFloat(formatPrice(planAmountPerUser * seats));

  const item = buildItem(params);
  const currencyCode = currency ?? 'EUR';

  try {
    globalThis.window.dataLayer.push({
      event: 'begin_checkout',
      ecommerce: {
        currency: currencyCode,
        value: totalAmount,
        items: [item],
      },
    });

    if (globalThis.window.gtag && SEND_TO.length > 0) {
      globalThis.window.gtag('event', 'begin_checkout', {
        send_to: SEND_TO,
        value: totalAmount,
        currency: currencyCode,
        items: [item],
        ...(promoCodeId && { coupon: promoCodeId }),
      });
    }
  } catch (error) {
    console.error(error);
  }
}

function trackPurchase(): void {
  try {
    const userSettings = localStorageService.getUser() as UserSettings;

    if (!userSettings) {
      return;
    }

    const { uuid, email } = userSettings;
    const subscriptionId = localStorageService.get('subscriptionId');
    const paymentIntentId = localStorageService.get('paymentIntentId');
    const productName = localStorageService.get('productName') || '';
    const priceId = localStorageService.get('priceId');
    const currency = localStorageService.get('currency');
    const amount = parseFloat(localStorageService.get('amountPaid') ?? '0');
    const couponCode = localStorageService.get('couponCode');

    const transactionId = paymentIntentId || subscriptionId || uuid;

    const isBusiness = productName.toLowerCase().includes('business');
    const isYearly = productName.toLowerCase().includes('year');
    const storageMatch = productName.match(/(\d+)(TB|GB)/i);
    const storage = storageMatch ? storageMatch[0] : '2TB';
    const planType = isBusiness ? 'business' : 'individual';
    const interval = isYearly ? 'year' : 'month';

    const formattedStorage = bytesToString(Number.parseInt(storage, 10)) || storage;

    const item = {
      item_id: priceId,
      item_name: `${formattedStorage} ${capitalizeFirstLetter(interval)} Plan`,
      item_category: getPlanCategory(planType),
      item_variant: interval,
      price: amount,
      quantity: 1,
      item_brand: 'Internxt',
      ...(couponCode && { coupon: couponCode }),
    };

    const currencyCode = currency ?? 'EUR';

    if (!globalThis.window.gtag) return;

    if (email) {
      globalThis.window.gtag('set', 'user_data', {
        email: email,
      });
    }

    globalThis.window.dataLayer.push({
      event: 'purchase',
      ecommerce: {
        transaction_id: transactionId,
        currency: currencyCode,
        value: amount,
        items: [item],
        coupon: couponCode ?? undefined,
      },
    });

    if (SEND_TO.length > 0) {
      globalThis.window.gtag('event', 'purchase', {
        send_to: SEND_TO,
        transaction_id: transactionId,
        value: amount,
        currency: currencyCode,
        items: [item],
        coupon: couponCode ?? undefined,
      });
    }
  } catch (error) {
    console.error(error);
  }
}

const gaService = {
  track,
  trackBeginCheckout,
  trackPurchase,
};

export default gaService;
