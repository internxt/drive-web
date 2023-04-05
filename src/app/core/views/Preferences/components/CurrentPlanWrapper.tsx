import { UserSubscription } from '@internxt/sdk/dist/drive/payments/types';
import { useTranslationContext } from '../../../../i18n/provider/TranslationProvider';
import { useContext, useEffect } from 'react';
import { TabContext } from '..';
import CurrentPlan from '../../../../shared/components/CurrentPlan';

const CURRENCY_SYMBOLS = {
  USD: '$', // US Dollar
  EUR: '€', // Euro
  CRC: '₡', // Costa Rican Colón
  GBP: '£', // British Pound Sterling
  ILS: '₪', // Israeli New Sheqel
  INR: '₹', // Indian Rupee
  JPY: '¥', // Japanese Yen
  KRW: '₩', // South Korean Won
  NGN: '₦', // Nigerian Naira
  PHP: '₱', // Philippine Peso
  PLN: 'zł', // Polish Zloty
  PYG: '₲', // Paraguayan Guarani
  THB: '฿', // Thai Baht
  UAH: '₴', // Ukrainian Hryvnia
  VND: '₫', // Vietnamese Dong
};

export default function CurrentPlanWrapper({
  className = '',
  bytesInPlan,
  userSubscription,
}: {
  className?: string;
  bytesInPlan: number;
  userSubscription: UserSubscription;
}): JSX.Element {
  const { translate } = useTranslationContext();
  let planName = '';
  let button: string | undefined;

  switch (userSubscription.type) {
    case 'free':
      planName = translate('views.account.tabs.account.view.free.planName');
      button = translate('views.account.tabs.account.view.free.button') as string;
      break;
    case 'lifetime':
      planName = translate('views.account.tabs.account.view.lifetime.planName');
      button = undefined;
      break;
    case 'subscription':
      planName = translate('views.account.tabs.account.view.subscription.planName');
      button = translate('views.account.tabs.account.view.subscription.button') as string;
      break;
  }

  let planSubtitle: Parameters<typeof CurrentPlan>[0]['planSubtitle'];

  useEffect(() => {
    if (userSubscription.type === 'subscription') {
      const currencySymbol =
        CURRENCY_SYMBOLS[userSubscription.currency.toUpperCase()] ?? userSubscription.currency.toUpperCase();
      const mainLabel = `${userSubscription.amount / 100} ${currencySymbol}/ ${
        userSubscription.interval === 'year'
          ? translate('views.account.tabs.account.view.subscription.yearly')
          : translate('views.account.tabs.account.view.subscription.monthly')
      }`;

      const beforeMainLabelCrossed = userSubscription.amountAfterCoupon
        ? `${userSubscription.amountAfterCoupon / 100} ${currencySymbol}`
        : undefined;

      planSubtitle = { mainLabel, beforeMainLabelCrossed };
    }
  });

  const tabContext = useContext(TabContext);

  function onClick() {
    tabContext.setActiveTab('plans');
  }

  return (
    <CurrentPlan
      className={className}
      onButtonClick={onClick}
      bytesInPlan={bytesInPlan}
      planName={planName}
      button={button}
      planSubtitle={planSubtitle}
    />
  );
}
