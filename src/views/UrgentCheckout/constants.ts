import { CSSProperties } from 'react';
import AdultCreativeImage from 'assets/images/urgent-checkout/adult.webp';
import MainstreamCreativeImage from 'assets/images/urgent-checkout/family.webp';

export enum UrgentCheckoutVariant {
  Mainstream = 'mainstream',
  Adult = 'adult',
}

export const URGENT_CHECKOUT_VARIANT_IMAGE: Record<UrgentCheckoutVariant, string> = {
  [UrgentCheckoutVariant.Mainstream]: MainstreamCreativeImage,
  [UrgentCheckoutVariant.Adult]: AdultCreativeImage,
};

export const DEFAULT_URGENT_CHECKOUT_VARIANT = UrgentCheckoutVariant.Mainstream;

export const getUrgentCheckoutVariant = (variant: string | null): UrgentCheckoutVariant => {
  const isKnownVariant = Object.values(UrgentCheckoutVariant).includes(variant as UrgentCheckoutVariant);

  return isKnownVariant ? (variant as UrgentCheckoutVariant) : DEFAULT_URGENT_CHECKOUT_VARIANT;
};

export const OFFER_COUNTDOWN_DURATION_MS = 60 * 60 * 1000;

export const OFFER_COUNTDOWN_STORAGE_KEY = 'urgentCheckoutOfferDeadline';

export const URGENT_CHECKOUT_THEME_STYLES = {
  backgroundColor: 'rgb(13 20 34)',
  textColor: 'rgb(255 255 255)',
  borderColor: 'rgb(32 45 69)',
  borderInputColor: 'rgb(47 63 92)',
  labelTextColor: 'rgb(167 180 200)',
};

export const URGENT_CHECKOUT_CARD_CLASSNAME = 'rounded-2xl border border-[#202D45] bg-[#0D1422]';

export const URGENT_CHECKOUT_CRYPTO_SECTION_STYLE = {
  '--color-surface': '10 17 32',
  '--color-gray-10': '47 63 92',
  '--color-gray-100': '255 255 255',
} as CSSProperties;

export const URGENT_CHECKOUT_CRYPTO_SECTION_CLASSNAME = 'w-full text-white';

export const URGENT_CHECKOUT_INPUT_CLASSNAME =
  'w-full rounded-lg border border-[#2F3F5C] bg-[#0A1120] px-4 py-3 text-base text-white outline-none ' +
  'placeholder:text-[#5F6E86] focus:border-primary focus:ring-1 focus:ring-primary';
