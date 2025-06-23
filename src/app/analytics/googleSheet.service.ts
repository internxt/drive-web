import { PriceWithTax } from '@internxt/sdk/dist/payments/types';
import envService from 'app/core/services/env.service';
import { CouponCodeData } from 'app/payment/types';
import { getProductAmount } from 'app/payment/utils/getProductAmount';

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

interface SendConversionToAPIPayload {
  gclid: string;
  name: string;
  value: PriceWithTax | undefined;
  currency?: string;
  timestamp?: Date;
  users: number;
  couponCodeData?: CouponCodeData;
}

export async function sendConversionToAPI({
  gclid,
  name,
  value,
  currency,
  timestamp,
  users,
  couponCodeData,
}: SendConversionToAPIPayload) {
  try {
    await new Promise<void>((r) => window.grecaptcha.ready(r));

    const token = await window.grecaptcha.execute(envService.getVariable('recaptchaV3'), {
      action: 'conversion',
    });
    const formattedTimestamp = formatDateToCustomTimezoneString(timestamp ?? new Date(), 2);
    const amountToPay = getProductAmount(value?.price.decimalAmount ?? 0, users, couponCodeData);
    const GSHEET_API = envService.getVariable('websiteUrl');
    const res = await fetch(`${GSHEET_API}/api/collect/sheet`, {
      method: 'POST',
      body: JSON.stringify({
        gclid: gclid,
        name: name,
        value: amountToPay,
        currency: currency ?? 'EUR',
        timestamp: formattedTimestamp,
        captcha: token,
      }),
    });

    const body = await res.json();

    if (!res.ok) {
      console.error('There was an error sending the event:', body);
    }
  } catch (error) {
    console.error('Something went wrong while sending an event to sheet API: ', error);
  }
}
