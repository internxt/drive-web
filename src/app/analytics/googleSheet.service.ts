import { PriceWithTax } from '@internxt/sdk/dist/payments/types';
import { envConfig } from 'app/core/services/env.service';
import { CouponCodeData } from 'app/payment/types';
import { getProductAmount } from 'app/payment/utils/getProductAmount';
import axios from 'axios';

const GSHEET_API = envConfig.gsheet.apiUrl;
const WINTER_TIME_OFFSET_HOURS = 1;

function formatDateToCustomTimezoneString(date: Date): string {
  const offsetHours = WINTER_TIME_OFFSET_HOURS;                
  const adjusted = new Date(date.getTime() + offsetHours * 3_600_000);

  const year    = adjusted.getUTCFullYear();
  const month   = String(adjusted.getUTCMonth() + 1).padStart(2, '0');
  const day     = String(adjusted.getUTCDate()).padStart(2, '0');
  const hours   = String(adjusted.getUTCHours()).padStart(2, '0');
  const minutes = String(adjusted.getUTCMinutes()).padStart(2, '0');
  const seconds = String(adjusted.getUTCSeconds()).padStart(2, '0');

  const offset = `+${String(offsetHours).padStart(2, '0')}00`;

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
      conversion.value?.price.decimalAmount ?? 0,
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
