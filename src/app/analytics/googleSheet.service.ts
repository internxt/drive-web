import { PriceWithTax } from '@internxt/sdk/dist/payments/types';
import envService from 'services/env.service';
import { CouponCodeData } from 'views/Checkout/types';
import { getProductAmount } from 'views/Checkout/utils';
const WINTER_OFFSET_HOUR = 1;
const TWO_EXTRA_HOURS_IN_MS = 2 * 60 * 60 * 1000;

export function formatDateAsUtcPlusOne(date: Date): string {
  const adjusted = new Date(date.getTime() + TWO_EXTRA_HOURS_IN_MS);

  const year = adjusted.getUTCFullYear();
  const month = String(adjusted.getUTCMonth() + 1).padStart(2, '0');
  const day = String(adjusted.getUTCDate()).padStart(2, '0');
  const hours = String(adjusted.getUTCHours()).padStart(2, '0');
  const minutes = String(adjusted.getUTCMinutes()).padStart(2, '0');
  const seconds = String(adjusted.getUTCSeconds()).padStart(2, '0');

  const offset = `+${String(WINTER_OFFSET_HOUR).padStart(2, '0')}00`;

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
    const formattedTimestamp = formatDateAsUtcPlusOne(timestamp ?? new Date());
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
