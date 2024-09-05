import { DisplayPrice } from '@internxt/sdk/dist/drive/payments/types';
import { CouponCodeData } from '../types';

export const getProductAmount = (
  amount: DisplayPrice['amount'],
  users: number,
  couponCodeData?: CouponCodeData,
): number => {
  if (couponCodeData?.amountOff) {
    return (amount - couponCodeData.amountOff / 100) * users;
  }

  if (couponCodeData?.percentOff) {
    const discount = 100 - couponCodeData.percentOff;

    return ((amount * discount) / 100) * users;
  }

  return amount * users;
};
