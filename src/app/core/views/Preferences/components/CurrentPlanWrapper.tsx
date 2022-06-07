import { UserSubscription } from '@internxt/sdk/dist/drive/payments/types';
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
  onButtonClick,
  bytesInPlan,
  userSubscription,
}: {
  className?: string;
  onButtonClick?: () => void;
  bytesInPlan: number;
  userSubscription: UserSubscription;
}): JSX.Element {
  let planName = '';
  let button: 'upgrade' | 'change' | undefined;

  switch (userSubscription.type) {
    case 'free':
      planName = 'Free plan';
      button = 'upgrade';
      break;
    case 'lifetime':
      planName = 'Lifetime';
      button = undefined;
      break;
    case 'subscription':
      planName = 'Subscription';
      button = 'change';
      break;
  }

  let planSubtitle: Parameters<typeof CurrentPlan>[0]['planSubtitle'];

  if (userSubscription.type === 'subscription') {
    const currencySymbol =
      CURRENCY_SYMBOLS[userSubscription.currency.toUpperCase()] ?? userSubscription.currency.toUpperCase();
    const mainLabel = `${userSubscription.amount / 100} ${currencySymbol}/ ${userSubscription.interval}`;

    const beforeMainLabelCrossed = userSubscription.amountAfterCoupon
      ? `${userSubscription.amountAfterCoupon / 100} ${currencySymbol}`
      : undefined;

    planSubtitle = { mainLabel, beforeMainLabelCrossed };
  }

  return (
    <CurrentPlan
      className={className}
      onButtonClick={onButtonClick}
      bytesInPlan={bytesInPlan}
      planName={planName}
      button={button}
      planSubtitle={planSubtitle}
    />
  );
}
