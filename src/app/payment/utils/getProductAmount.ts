import { DisplayPrice } from '@internxt/sdk/dist/drive/payments/types/types';
import { CouponCodeData } from '../types';
import { formatPrice } from './formatPrice';

export const getProductAmount = (
  amount: DisplayPrice['amount'],
  users: number,
  couponCodeData?: CouponCodeData,
): string => {
  let finalAmount;

  if (couponCodeData?.amountOff) {
    finalAmount = (amount - couponCodeData.amountOff / 100) * users;
  } else if (couponCodeData?.percentOff) {
    const discount = 100 - couponCodeData.percentOff;
    finalAmount = ((amount * discount) / 100) * users;
  } else {
    finalAmount = amount * users;
  }

  return formatPrice(finalAmount);
};
