import { TimerIcon } from '@phosphor-icons/react';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import { useOfferCountdown } from '../hooks/useOfferCountdown';

interface OfferCountdownCardProps {
  storage: string;
  priceLabel: string;
  discountPercent?: number;
}

const CountdownUnit = ({ value }: { value: string }) => (
  <div className="flex min-w-[64px] items-center justify-center rounded-xl border border-[#2A5BA8] bg-[#102A4E] px-4 py-2">
    <p className="text-3xl font-bold tabular-nums text-white">{value}</p>
  </div>
);

export const OfferCountdownCard = ({ storage, priceLabel, discountPercent }: OfferCountdownCardProps): JSX.Element => {
  const { translate } = useTranslationContext();
  const { hours, minutes, seconds } = useOfferCountdown();

  const title = discountPercent
    ? translate('urgentCheckout.countdown.title', { percent: discountPercent })
    : translate('urgentCheckout.countdown.titleNoDiscount');

  return (
    <section className="flex flex-col items-center gap-4 rounded-2xl border border-[#1E4A8F] bg-[#0E1E38] p-5">
      <div className="flex flex-row items-center gap-2">
        <TimerIcon size={24} className="shrink-0 text-[#4D9BFF]" />
        <p className="text-center text-base font-medium text-white">{title}</p>
      </div>
      <div className="flex flex-row items-center gap-3" aria-live="off">
        <CountdownUnit value={hours} />
        <span className="text-2xl font-bold text-[#4D9BFF]">:</span>
        <CountdownUnit value={minutes} />
        <span className="text-2xl font-bold text-[#4D9BFF]">:</span>
        <CountdownUnit value={seconds} />
      </div>
      <p className="text-center text-sm text-[#8FB6EE]">
        {translate('urgentCheckout.countdown.footer', { storage, price: priceLabel })}
      </p>
    </section>
  );
};
