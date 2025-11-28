import { bytesToString } from 'app/drive/services/size.service';
import { formatPrice } from 'views/Checkout/utils/formatPrice';
import { getProductAmount } from 'views/Checkout/utils/getProductAmount';
import { CouponCodeData } from 'views/Checkout/types';

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

function track(eventName: string, object: Record<string, any>): void {
  try {
    globalThis.window.gtag('event', eventName, object);
  } catch (error) {
    console.error('Error tracking event:', eventName, error);
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

  try {
    globalThis.window.gtag('event', 'begin_checkout', {
      currency: currency ?? 'EUR',
      value: totalAmount,
      ...(promoCodeId && { coupon: promoCodeId }),
      items: [
        {
          item_id: planId,
          item_name: `${formattedStorage} ${capitalizeFirstLetter(interval)} Plan`,
          item_category: getPlanCategory(planType),
          item_variant: interval,
          price: Number.parseFloat(formatPrice(planPrice)),
          quantity: seats,
          item_brand: 'Internxt',
          ...(promoCodeId && { coupon: promoCodeId }),
          ...(discount > 0 && { discount }),
        },
      ],
    });
  } catch (error) {
    console.error('Error tracking begin_checkout event:', error);
  }
}

const gaService = {
  track,
  trackBeginCheckout,
};

export default gaService;
