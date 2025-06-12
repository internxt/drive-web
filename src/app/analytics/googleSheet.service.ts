import { PriceWithTax } from '@internxt/sdk/dist/payments/types';
import { envConfig } from 'app/core/services/env.service';
import { CouponCodeData } from 'app/payment/types';
import { getProductAmount } from 'app/payment/utils/getProductAmount';
import axios from 'axios';

const GSHEET_API = envConfig.gsheet.apiUrl;

function formatDateToCustomTimezoneString(date: Date, offsetHours: number): string {
  const adjusted = new Date(date.getTime() + offsetHours * 60 * 60 * 1000);

  const year = adjusted.getFullYear();
  const month = String(adjusted.getMonth() + 1).padStart(2, '0');
  const day = String(adjusted.getDate()).padStart(2, '0');
  const hours = String(adjusted.getHours()).padStart(2, '0');
  const minutes = String(adjusted.getMinutes()).padStart(2, '0');
  const seconds = String(adjusted.getSeconds()).padStart(2, '0');

  const offset =
    offsetHours >= 0
      ? `+${String(offsetHours).padStart(2, '0')}00`
      : `-${String(Math.abs(offsetHours)).padStart(2, '0')}00`;

  return `${month}-${day}-${year} ${hours}:${minutes}:${seconds}${offset}`;
}

export async function sendConversionToAPI(conversion: {
  gclid: string;
  name: string;
  value:  PriceWithTax | undefined;
  currency?: string;
  timestamp?: Date;
  users: number,
  couponCodeData: CouponCodeData | undefined,
}) {
  try {
    const formattedTimestamp = formatDateToCustomTimezoneString(conversion.timestamp ?? new Date(), 2);
    const amountToPay = getProductAmount(
      conversion.value?.price.amount ?? 0,
      conversion.users,
      conversion.couponCodeData
    );


    await axios.post(`${GSHEET_API}/google-sheet`, {
      gclid: conversion.gclid,
      name: conversion.name,
      value: amountToPay,
      currency: conversion.currency ?? 'EUR',
      timestamp: formattedTimestamp,
    });
  } catch (error) {
    console.error('Error sending conversion:', error);
  }
}
