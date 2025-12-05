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

interface CheckoutItemData {
  item_name: string;
  item_category: string;
  item_variant: string;
  discount: number;
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
    console.error('[GA Service] Error tracking event:', error);
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
    console.warn('[GA Service] Invalid final price when calculating discount');
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
  try {
    const { planPrice, currency, promoCodeId, couponCodeData, seats = 1 } = params;

    const planAmountPerUserString = getProductAmount(planPrice, 1, couponCodeData);
    const planAmountPerUser = Number.parseFloat(planAmountPerUserString);
    const totalAmount = Number.parseFloat(formatPrice(planAmountPerUser * seats));

    const item = buildItem(params);
    const currencyCode = currency ?? 'EUR';

    localStorageService.set('itemOriginalPrice', item.price.toString());

    const checkoutItemData: CheckoutItemData = {
      item_name: item.item_name,
      item_category: item.item_category,
      item_variant: item.item_variant,
      discount: item.discount || 0,
    };

    localStorageService.set('checkout_item_data', JSON.stringify(checkoutItemData));

    const ecommerceData = {
      currency: currencyCode,
      value: totalAmount,
      items: [item],
    };

    globalThis.window.dataLayer.push({
      event: 'begin_checkout',
      ecommerce: ecommerceData,
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
    console.error('[GA Service] Error in trackBeginCheckout:', error);
  }
}

function trackPurchase(): void {
  try {
    const userSettings = localStorageService.getUser() as UserSettings;
    if (!userSettings) {
      console.warn('[GA Service] No user settings found, aborting purchase tracking');
      return;
    }

    const { uuid, email } = userSettings;

    const checkoutItemDataStr = localStorageService.get('checkout_item_data');
    if (!checkoutItemDataStr) {
      console.warn('[GA Service] No checkout data found, purchase may have already been tracked');
      return;
    }

    const subscriptionId = localStorageService.get('subscriptionId');
    const paymentIntentId = localStorageService.get('paymentIntentId');
    const priceId = localStorageService.get('priceId');
    const currency = localStorageService.get('currency');
    const amountPaidString = localStorageService.get('amountPaid');
    const amount = Number.parseFloat(amountPaidString ?? '0');

    const itemOriginalPriceStr = localStorageService.get('itemOriginalPrice');
    const itemOriginalPrice = Number.parseFloat(itemOriginalPriceStr ?? '0');

    const couponCode = localStorageService.get('couponCode');

    let checkoutItemData: CheckoutItemData | null = null;
    try {
      checkoutItemData = JSON.parse(checkoutItemDataStr) as CheckoutItemData;
    } catch (parseError) {
      console.error('[GA Service] Error parsing checkout_item_data:', parseError);
    }

    const transactionId = paymentIntentId || subscriptionId || uuid;
    const currencyCode = currency ?? 'EUR';

    const itemName = checkoutItemData?.item_name || 'Unknown Plan';
    const itemCategory = checkoutItemData?.item_category || 'Individual';
    const itemVariant = checkoutItemData?.item_variant || 'month';
    const itemDiscount = checkoutItemData?.discount || 0;

    const finalPrice = itemOriginalPrice > 0 ? itemOriginalPrice : amount;

    const item = {
      item_id: priceId,
      item_name: itemName,
      item_category: itemCategory,
      item_variant: itemVariant,
      price: finalPrice,
      quantity: 1,
      item_brand: 'Internxt',
      ...(couponCode && { coupon: couponCode }),
      ...(itemDiscount > 0 && { discount: itemDiscount }),
    };

    if (!globalThis.window.gtag) {
      console.warn('[GA Service] gtag not available');
      return;
    }

    if (email) {
      globalThis.window.gtag('set', 'user_data', {
        email: email,
      });
    }

    const purchaseEcommerce = {
      transaction_id: transactionId,
      currency: currencyCode,
      value: amount,
      items: [item],
      coupon: couponCode ?? undefined,
    };

    globalThis.window.dataLayer.push({
      event: 'purchase',
      ecommerce: purchaseEcommerce,
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

    localStorageService.removeItem('checkout_item_data');
    localStorageService.removeItem('itemOriginalPrice');
  } catch (error) {
    console.error('[GA Service] Error in trackPurchase:', error);
  }
}

const gaService = {
  track,
  trackBeginCheckout,
  trackPurchase,
};

export default gaService;
