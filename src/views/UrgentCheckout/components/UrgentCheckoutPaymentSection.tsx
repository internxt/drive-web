import { ShieldCheckIcon } from '@phosphor-icons/react';
import { PaymentElement } from '@stripe/react-stripe-js';
import { StripePaymentElementOptions } from '@stripe/stripe-js';
import AmexLogo from 'assets/icons/card-brands/amex.png';
import DiscoverLogo from 'assets/icons/card-brands/discover.png';
import MastercardLogo from 'assets/icons/card-brands/mastercard.png';
import VisaLogo from 'assets/icons/card-brands/visa.png';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import { UrgentCheckoutPlanSummary } from '../utils/getUrgentCheckoutPlanSummary';

export const URGENT_CHECKOUT_PAYMENT_ELEMENT_OPTIONS: StripePaymentElementOptions = {
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

interface UrgentCheckoutPaymentSectionProps {
  planSummary: UrgentCheckoutPlanSummary;
  isPaymentProcessing: boolean;
}

const CARD_BRAND_LOGOS = [
  { src: VisaLogo, alt: 'Visa' },
  { src: MastercardLogo, alt: 'Mastercard' },
  { src: AmexLogo, alt: 'American Express' },
  { src: DiscoverLogo, alt: 'Discover' },
];

export const UrgentCheckoutPaymentSection = ({
  planSummary,
  isPaymentProcessing,
}: UrgentCheckoutPaymentSectionProps): JSX.Element => {
  const { translate } = useTranslationContext();
  const { currencySymbol, discountedAmount, normalAmount, interval, isRecurring, discountPercent } = planSummary;

  const priceLabel = `${currencySymbol}${discountedAmount}`;
  const renewalPriceLabel = `${currencySymbol}${normalAmount}`;
  const introPriceKey = discountPercent ? 'withIntroPrice' : 'withoutIntroPrice';
  const billingDisclosureKey = `urgentCheckout.cta.billingDisclosure.${introPriceKey}.${interval}`;
  const buttonKey = isRecurring ? 'urgentCheckout.cta.button.subscription' : 'urgentCheckout.cta.button.lifetime';

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        <PaymentElement options={URGENT_CHECKOUT_PAYMENT_ELEMENT_OPTIONS} />
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
        {isPaymentProcessing ? translate('checkout.processing') : translate(buttonKey)}
      </button>

      {isRecurring && (
        <p className="text-center text-sm text-[#7D8CA3]">
          {translate(billingDisclosureKey, { price: priceLabel, renewalPrice: renewalPriceLabel })}
        </p>
      )}

      <div className="flex flex-row items-center gap-3 rounded-xl border border-[#2A5BA8] bg-[#0E1E38] p-4">
        <ShieldCheckIcon size={32} weight="fill" className="shrink-0 text-[#4D9BFF]" />
        <div className="flex flex-col">
          <p className="text-lg font-semibold text-white">{translate('urgentCheckout.guarantee.title')}</p>
          <p className="text-sm text-[#A7B4C8]">{translate('urgentCheckout.guarantee.description')}</p>
        </div>
      </div>
    </div>
  );
};
