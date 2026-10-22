import { LockKeyIcon } from '@phosphor-icons/react';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';

export const UrgentCheckoutLifetimeNotice = (): JSX.Element => {
  const { translate } = useTranslationContext();

  return (
    <div className="flex flex-row items-start gap-3 rounded-xl border border-[#1E5B36] bg-[#0E2B1B] p-4">
      <LockKeyIcon size={24} weight="fill" className="shrink-0 text-[#3BD16F]" />
      <div className="flex flex-col gap-1">
        <p className="text-base font-semibold text-[#3BD16F]">{translate('urgentCheckout.lifetimeNotice.title')}</p>
        <p className="text-sm leading-snug text-[#A7B4C8]">{translate('urgentCheckout.lifetimeNotice.description')}</p>
        <p className="text-sm leading-snug text-[#A7B4C8]">
          {translate('urgentCheckout.lifetimeNotice.singlePayment')}
        </p>
      </div>
    </div>
  );
};
