import { bytesToString } from 'app/drive/services/size.service';
import { formatPrice } from 'views/Checkout/utils/formatPrice';
import { getProductAmount } from 'views/Checkout/utils/getProductAmount';
import { CouponCodeData } from 'views/Checkout/types';
import envService from 'services/env.service';

interface TrackBeginCheckoutParams {
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

interface TrackPurchaseParams {
  transactionId: string;
  amount: number;
  currency: string;
  planName: string;
  planId: string;
  coupon?: string;
}

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

function trackBeginCheckout(params: TrackBeginCheckoutParams): void {
  const { planId, planPrice, currency, planType, interval, storage, promoCodeId, couponCodeData, seats = 1 } = params;

  const storageBytes = Number.parseInt(storage, 10);
  const formattedStorage = Number.isNaN(storageBytes) ? storage : bytesToString(storageBytes);

  const planAmountPerUserString = getProductAmount(planPrice, 1, couponCodeData);
  const planAmountPerUser = Number.parseFloat(planAmountPerUserString);
  const totalAmount = Number.parseFloat(formatPrice(planAmountPerUser * seats));
  const discount = calculateDiscountAmount(planPrice, couponCodeData);

  const item = {
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

  try {
    globalThis.window.dataLayer.push({
      event: 'begin_checkout',
      ecommerce: {
        currency: currency ?? 'EUR',
        value: totalAmount,
        items: [item],
      },
    });

    if (globalThis.window.gtag && SEND_TO.length > 0) {
      globalThis.window.gtag('event', 'begin_checkout', {
        send_to: SEND_TO,
        value: totalAmount,
        currency: currency ?? 'EUR',
        items: [item],
        ...(promoCodeId && { coupon: promoCodeId }),
      });
    }
  } catch (error) {
    console.error(error);
  }
}

function trackPurchase(params: TrackPurchaseParams): void {
  const { transactionId, amount, currency, planName, planId, coupon } = params;

  if (!transactionId) {
    return;
  }

  const item = {
    item_id: planId,
    item_name: planName,
    price: amount,
    quantity: 1,
    item_brand: 'Internxt',
    ...(coupon && { coupon }),
  };

  try {
    globalThis.window.dataLayer.push({
      event: 'purchase',
      ecommerce: {
        transaction_id: transactionId,
        value: amount,
        currency: currency ?? 'EUR',
        items: [item],
        ...(coupon && { coupon }),
      },
    });

    if (globalThis.window.gtag && SEND_TO.length > 0) {
      globalThis.window.gtag('event', 'purchase', {
        send_to: SEND_TO,
        transaction_id: transactionId,
        value: amount,
        currency: currency ?? 'EUR',
        items: [item],
        ...(coupon && { coupon }),
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
