import { PriceWithTax } from '@internxt/sdk/dist/payments/types';
import { envConfig } from 'app/core/services/env.service';
import { CouponCodeData } from 'app/payment/types';
import { getProductAmount } from 'app/payment/utils/getProductAmount';

const GSHEET_API = envConfig.gsheet.apiUrl;
const WINTER_TIME_OFFSET_HOURS = 1;


export function formatDateToCustomTimezoneString(date: Date): string {
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

    const token = await window.grecaptcha.execute(envConfig.services.recaptchaV3, {
      action: 'conversion',
    });
    const formattedTimestamp = formatDateToCustomTimezoneString(timestamp ?? new Date(), 2);
    const amountToPay = getProductAmount(value?.price.decimalAmount ?? 0, users, couponCodeData);

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
