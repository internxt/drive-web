import { CouponCodeData } from '@internxt/sdk/dist/drive/payments/types/types';
import { PriceWithTax } from '@internxt/sdk/dist/payments/types';
import { bytesToString } from 'app/drive/services/size.service';
import { Translate } from 'app/i18n/types';
import { Currency } from 'views/Checkout/types';
import { formatPrice, getProductAmount } from 'views/Checkout/utils';

export interface BfCheckoutPlanSummary {
  storage: string;
  planLabel: string;
  billedLabel: string;
  currencySymbol: string;
  discountedAmount: string;
  normalAmount: string;
  taxAmount: string;
  totalAmount: string;
  savingsAmount: string;
  discountPercent?: number;
  interval: string;
  isRecurring: boolean;
}

const PERCENTAGE = 100;

const getDiscountPercent = (
  normalAmount: number,
  discountedAmount: number,
  couponCodeData?: CouponCodeData,
): number | undefined => {
  if (couponCodeData?.percentOff) {
    return couponCodeData.percentOff;
  }

  const savings = normalAmount - discountedAmount;

  if (normalAmount <= 0 || savings <= 0) {
    return undefined;
  }

  return Math.round((savings / normalAmount) * PERCENTAGE);
};

export const getBfCheckoutPlanSummary = (
  selectedPlan: PriceWithTax,
  translate: Translate,
  couponCodeData?: CouponCodeData,
): BfCheckoutPlanSummary => {
  const { price, taxes } = selectedPlan;

  const storage = bytesToString(price.bytes);
  const normalAmount = price.decimalAmount;
  const discountedAmount = Number(getProductAmount(normalAmount, 1, couponCodeData));
  const totalAmount = Number(formatPrice(taxes.decimalAmountWithTax));
  const taxAmount = Math.max(0, totalAmount - discountedAmount);
  const savingsAmount = Math.max(0, normalAmount - discountedAmount);

  const planTitleKey = `preferences.account.plans.planFeaturesList.${storage}.title`;
  const translatedPlanTitle = translate(planTitleKey);
  const planName =
    translatedPlanTitle === planTitleKey
      ? translate('preferences.account.plans.planFeaturesList.default.bytesTitle', { bytes: storage })
      : translatedPlanTitle;

  return {
    storage,
    planLabel: `${planName} — ${translate(`checkout.productCard.renewalTitle.${price.interval}`)}`,
    billedLabel: translate(`checkout.productCard.billed.${price.interval}`),
    currencySymbol: Currency[price.currency] ?? '',
    discountedAmount: formatPrice(discountedAmount),
    normalAmount: formatPrice(normalAmount),
    taxAmount: formatPrice(taxAmount),
    totalAmount: formatPrice(totalAmount),
    savingsAmount: formatPrice(savingsAmount),
    discountPercent: getDiscountPercent(normalAmount, discountedAmount, couponCodeData),
    interval: price.interval,
    isRecurring: price.interval !== 'lifetime',
  };
};
