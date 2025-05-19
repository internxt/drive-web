import { DisplayPrice } from '@internxt/sdk/dist/drive/payments/types';
import { CouponCodeData } from '../types';

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

  const formattedAmount = Number(finalAmount.toFixed(2));
  return Number.isInteger(formattedAmount) ? formattedAmount.toString() : finalAmount.toFixed(2);
};
