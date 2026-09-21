import {
  CodeIcon,
  FolderSimpleIcon,
  GlobeHemisphereWestIcon,
  Icon,
  InfinityIcon,
  LockIcon,
  ShieldCheckIcon,
  TagIcon,
} from '@phosphor-icons/react';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import { BfCheckoutPlanSummary } from '../utils/getBfCheckoutPlanSummary';

interface BfCheckoutHeroProps {
  planSummary: BfCheckoutPlanSummary;
  creativeImage: string;
}

const SellingPoint = ({ icon: PointIcon, title, description }: { icon: Icon; title: string; description: string }) => (
  <li className="flex flex-row items-start gap-4">
    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[#1E4A8F] bg-[#0E1E38]">
      <PointIcon size={24} className="text-[#4D9BFF]" />
    </div>
    <div className="flex flex-col gap-1">
      <p className="text-lg font-semibold text-white">{title}</p>
      <p className="text-base leading-snug text-[#A7B4C8]">{description}</p>
    </div>
  </li>
);

const FooterBadge = ({ icon: BadgeIcon, label }: { icon: Icon; label: string }) => (
  <div className="flex flex-row items-center gap-2 rounded-xl border border-[#202D45] bg-[#0D1422] px-4 py-3">
    <BadgeIcon size={20} className="shrink-0 text-[#4D9BFF]" />
    <p className="text-xs leading-tight text-[#A7B4C8]">{label}</p>
  </div>
);

export const BfCheckoutHero = ({ planSummary, creativeImage }: BfCheckoutHeroProps): JSX.Element => {
  const { translate } = useTranslationContext();
  const { storage, currencySymbol, discountedAmount, discountPercent } = planSummary;

  const priceLabel = `${currencySymbol}${discountedAmount}`;

  const offerPillLabel = discountPercent
    ? translate('bfCheckout.hero.offerPill', { percent: discountPercent })
    : translate('bfCheckout.hero.offerPillNoDiscount');

  const offerPointTitle = discountPercent
    ? translate('bfCheckout.hero.points.offer.title', { percent: discountPercent })
    : translate('bfCheckout.hero.points.offer.titleNoDiscount');

  return (
    <section className="flex w-full flex-col gap-8">
      <div className="flex w-fit flex-row items-center rounded-full border border-[#1E4A8F] bg-[#0E1E38] px-5 py-2">
        <p className="text-sm font-semibold text-[#4D9BFF]">{offerPillLabel}</p>
      </div>

      <div className="flex flex-col gap-4">
        <h1 className="text-4xl font-bold leading-tight text-white sm:text-5xl">
          {translate('bfCheckout.hero.title')}{' '}
          <span className="text-[#4D9BFF]">{translate('bfCheckout.hero.titleHighlight')}</span>
        </h1>
        <p className="text-xl leading-snug text-[#C4CEDD]">
          {translate('bfCheckout.hero.subtitle', { storage, price: priceLabel })}
        </p>
      </div>

      <ul className="flex flex-col gap-6">
        <SellingPoint
          icon={LockIcon}
          title={translate('bfCheckout.hero.points.privacy.title')}
          description={translate('bfCheckout.hero.points.privacy.description')}
        />
        <SellingPoint
          icon={FolderSimpleIcon}
          title={translate('bfCheckout.hero.points.storage.title')}
          description={translate('bfCheckout.hero.points.storage.description')}
        />
        <SellingPoint
          icon={TagIcon}
          title={offerPointTitle}
          description={translate('bfCheckout.hero.points.offer.description', { storage, price: priceLabel })}
        />
      </ul>

      <img
        src={creativeImage}
        alt={translate('bfCheckout.hero.imageAlt')}
        className="w-full rounded-2xl border border-[#202D45] object-cover"
        loading="eager"
      />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <FooterBadge icon={GlobeHemisphereWestIcon} label={translate('bfCheckout.hero.badges.basedInEu')} />
        <FooterBadge icon={CodeIcon} label={translate('bfCheckout.hero.badges.openSource')} />
        <FooterBadge icon={ShieldCheckIcon} label={translate('bfCheckout.hero.badges.audited')} />
        <FooterBadge icon={InfinityIcon} label={translate('bfCheckout.hero.badges.privacyPriority')} />
      </div>
    </section>
  );
};
