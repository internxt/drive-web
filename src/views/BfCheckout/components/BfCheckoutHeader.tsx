import { LockIcon, ShieldCheckIcon, UsersThreeIcon } from '@phosphor-icons/react';
import InternxtLogo from 'assets/icons/big-logo.svg?react';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';

const TrustBadge = ({ icon, label }: { icon: JSX.Element; label: string }) => (
  <div className="flex flex-row items-center gap-2 text-[#A7B4C8]">
    {icon}
    <p className="max-w-[120px] text-sm leading-tight">{label}</p>
  </div>
);

export const BfCheckoutHeader = (): JSX.Element => {
  const { translate } = useTranslationContext();

  const iconClassName = 'shrink-0 text-white';

  return (
    <header className="flex w-full flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
      <div className="flex flex-col gap-1">
        <InternxtLogo className="h-auto w-36 text-white" />
        <p className="text-[11px] uppercase tracking-[0.3em] text-[#7D8CA3]">
          {translate('bfCheckout.header.tagline')}
        </p>
      </div>
      <div className="flex flex-row flex-wrap items-center gap-x-6 gap-y-3">
        <TrustBadge
          icon={<ShieldCheckIcon size={22} className={iconClassName} />}
          label={translate('bfCheckout.header.europeanBased')}
        />
        <TrustBadge
          icon={<LockIcon size={22} className={iconClassName} />}
          label={translate('bfCheckout.header.gdprCompliant')}
        />
        <TrustBadge
          icon={<UsersThreeIcon size={22} className={iconClassName} />}
          label={translate('bfCheckout.header.trustedByMillions')}
        />
      </div>
    </header>
  );
};
