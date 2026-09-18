import { ShieldCheckIcon } from '@phosphor-icons/react';
import { PaymentElement } from '@stripe/react-stripe-js';
import { StripePaymentElementOptions } from '@stripe/stripe-js';
import AmexLogo from 'assets/icons/card-brands/amex.png';
import DiscoverLogo from 'assets/icons/card-brands/discover.png';
import MastercardLogo from 'assets/icons/card-brands/mastercard.png';
import VisaLogo from 'assets/icons/card-brands/visa.png';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import { BfCheckoutPlanSummary } from '../utils/getBfCheckoutPlanSummary';

export const BF_CHECKOUT_PAYMENT_ELEMENT_OPTIONS: StripePaymentElementOptions = {
  wallets: {
    applePay: 'auto',
    googlePay: 'auto',
  },
  layout: {
    type: 'accordion',
    radios: false,
    spacedAccordionItems: true,
  },
};

interface BfCheckoutPaymentSectionProps {
  planSummary: BfCheckoutPlanSummary;
  isPaymentProcessing: boolean;
  onPaymentExpanded: () => void;
}

const CARD_BRAND_LOGOS = [
  { src: VisaLogo, alt: 'Visa' },
  { src: MastercardLogo, alt: 'Mastercard' },
  { src: AmexLogo, alt: 'American Express' },
  { src: DiscoverLogo, alt: 'Discover' },
];

export const BfCheckoutPaymentSection = ({
  planSummary,
  isPaymentProcessing,
  onPaymentExpanded,
}: BfCheckoutPaymentSectionProps): JSX.Element => {
  const { translate } = useTranslationContext();
  const { storage, currencySymbol, discountedAmount, normalAmount, interval, isRecurring } = planSummary;

  const priceLabel = `${currencySymbol}${discountedAmount}`;
  const renewalPriceLabel = `${currencySymbol}${normalAmount}`;
  const renewalNoteKey =
    interval === 'year' ? 'checkout.bfCheckout.cta.renewalNoteYearly' : 'checkout.bfCheckout.cta.renewalNoteMonthly';

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        <PaymentElement
          options={BF_CHECKOUT_PAYMENT_ELEMENT_OPTIONS}
          onChange={(event) => {
            if (!event.collapsed) {
              onPaymentExpanded();
            }
          }}
        />
        <div className="flex flex-row items-center gap-2">
          {CARD_BRAND_LOGOS.map(({ src, alt }) => (
            <img key={alt} src={src} alt={alt} className="h-6 w-auto rounded-[3px]" />
          ))}
        </div>
      </div>

      <button
        type="submit"
        id="submit-create-account"
        disabled={isPaymentProcessing}
        className="w-full rounded-xl bg-primary px-6 py-4 text-lg font-semibold text-white transition-colors
          duration-150 hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPaymentProcessing
          ? translate('checkout.processing')
          : translate('checkout.bfCheckout.cta.button', { storage, price: priceLabel })}
      </button>

      {isRecurring && (
        <p className="text-center text-sm text-[#7D8CA3]">
          {translate(renewalNoteKey, { price: priceLabel, renewalPrice: renewalPriceLabel })}
        </p>
      )}

      <div className="flex flex-row items-center justify-center gap-2">
        <ShieldCheckIcon size={20} weight="fill" className="text-[#4D9BFF]" />
        <p className="text-sm font-medium text-white">{translate('featuresBanner.guarantee')}</p>
      </div>
    </div>
  );
};
