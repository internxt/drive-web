import { CSSProperties } from 'react';
import AdultCreativeImage from 'assets/bf-checkout/adult.webp';
import MainstreamCreativeImage from 'assets/bf-checkout/family.webp';

export enum BfCheckoutVariant {
  Mainstream = 'mainstream',
  Adult = 'adult',
}

export const BF_CHECKOUT_VARIANT_IMAGE: Record<BfCheckoutVariant, string> = {
  [BfCheckoutVariant.Mainstream]: MainstreamCreativeImage,
  [BfCheckoutVariant.Adult]: AdultCreativeImage,
};

export const DEFAULT_BF_CHECKOUT_VARIANT = BfCheckoutVariant.Mainstream;

export const getBfCheckoutVariant = (variant: string | null): BfCheckoutVariant => {
  const isKnownVariant = Object.values(BfCheckoutVariant).includes(variant as BfCheckoutVariant);

  return isKnownVariant ? (variant as BfCheckoutVariant) : DEFAULT_BF_CHECKOUT_VARIANT;
};

export const OFFER_COUNTDOWN_DURATION_MS = 60 * 60 * 1000;

export const OFFER_COUNTDOWN_STORAGE_KEY = 'bfCheckoutOfferDeadline';

export const BF_CHECKOUT_THEME_STYLES = {
  backgroundColor: 'rgb(13 20 34)',
  textColor: 'rgb(255 255 255)',
  borderColor: 'rgb(32 45 69)',
  borderInputColor: 'rgb(47 63 92)',
  labelTextColor: 'rgb(167 180 200)',
};

export const BF_CHECKOUT_CARD_CLASSNAME = 'rounded-2xl border border-[#202D45] bg-[#0D1422]';

export const BF_CHECKOUT_CRYPTO_SECTION_STYLE = {
  '--color-surface': '10 17 32',
  '--color-gray-10': '47 63 92',
  '--color-gray-100': '255 255 255',
} as CSSProperties;

export const BF_CHECKOUT_CRYPTO_SECTION_CLASSNAME = 'w-full text-white';

export const BF_CHECKOUT_INPUT_CLASSNAME =
  'w-full rounded-lg border border-[#2F3F5C] bg-[#0A1120] px-4 py-3 text-base text-white outline-none ' +
  'placeholder:text-[#5F6E86] focus:border-primary focus:ring-1 focus:ring-primary';
