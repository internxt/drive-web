import { DisplayPrice } from '@internxt/sdk/dist/drive/payments/types';
import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { bytesToString } from '../../../../../drive/services/size.service';
import notificationsService, { ToastType } from '../../../../../notifications/services/notifications.service';
import paymentService from '../../../../../payment/services/payment.service';
import Button from '../../../../../shared/components/Button/Button';
import { RootState } from '../../../../../store';
import { useAppDispatch } from '../../../../../store/hooks';
import { planActions, PlanState } from '../../../../../store/slices/plan';

export default function PlanSelector({ className = '' }: { className?: string }): JSX.Element {
  const dispatch = useAppDispatch();
  const { translate } = useTranslationContext();

  const plan = useSelector<RootState, PlanState>((state) => state.plan);
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const user = useSelector<RootState, UserSettings>((state) => state.user.user!);
  if (user === undefined) throw new Error('User is not defined');

  const { subscription } = plan;

  const priceButtons = subscription?.type === 'subscription' ? 'change' : 'upgrade';

  const [prices, setPrices] = useState<DisplayPrice[] | null>(null);
  const [interval, setInterval] = useState<DisplayPrice['interval']>('year');

  useEffect(() => {
    paymentService.getPrices().then(setPrices);
  }, []);

  const pricesFilteredAndSorted = prices
    ?.filter((price) => price.interval === interval)
    .sort((a, b) => a.amount - b.amount);

  const [loadingPlanAction, setLoadingPlanAction] = useState<string | null>(null);

  async function onPlanClick(priceId: string) {
    setLoadingPlanAction(priceId);

    if (subscription?.type !== 'subscription') {
      try {
        const response = await paymentService.createCheckoutSession({
          price_id: priceId,
          success_url: `${window.location.origin}/checkout/success`,
          cancel_url: window.location.href,
          customer_email: user.email,
          mode: interval === 'lifetime' ? 'payment' : 'subscription',
        });
        localStorage.setItem('sessionId', response.sessionId);
        await paymentService.redirectToCheckout(response);
      } catch (err) {
        console.error(err);
        notificationsService.show({
          text: 'Something went wrong while creating your subscription',
          type: ToastType.Error,
        });
      } finally {
        setLoadingPlanAction(null);
      }
    } else {
      try {
        const updatedSubscription = await paymentService.updateSubscriptionPrice(priceId);
        dispatch(planActions.setSubscription(updatedSubscription));
        notificationsService.show({ text: 'Subscription updated successfully', type: ToastType.Success });
      } catch (err) {
        console.error(err);
        notificationsService.show({
          text: 'Something went wrong while updating your subscription',
          type: ToastType.Error,
        });
      } finally {
        setLoadingPlanAction(null);
      }
    }
  }

  return (
    <div className={`${className}`}>
      <div className="flex justify-center">
        <div className="flex flex-row rounded-lg bg-cool-gray-10 p-0.5 text-sm">
          <IntervalSwitch
            active={interval === 'month'}
            text={translate('general.renewal.monthly')}
            onClick={() => setInterval('month')}
          />
          <IntervalSwitch
            active={interval === 'year'}
            text={translate('general.renewal.annually')}
            onClick={() => setInterval('year')}
          />
          <IntervalSwitch
            active={interval === 'lifetime'}
            text={translate('general.renewal.lifetime')}
            onClick={() => setInterval('lifetime')}
          />
        </div>
      </div>
      <div className="mt-5 flex flex-col justify-center gap-y-5 lg:flex-row lg:gap-y-0 lg:gap-x-5">
        {pricesFilteredAndSorted?.map((price) => (
          <Price
            key={price.id}
            {...price}
            button={
              subscription?.type === 'subscription' && subscription.priceId === price.id ? 'current' : priceButtons
            }
            onClick={() => onPlanClick(price.id)}
            loading={loadingPlanAction === price.id}
            disabled={loadingPlanAction !== null}
          />
        ))}
      </div>
    </div>
  );
}

function IntervalSwitch({
  text,
  active,
  onClick,
}: {
  text: string;
  active: boolean;
  onClick?: () => void;
}): JSX.Element {
  return (
    <button
      className={`${active ? 'bg-white text-gray-100 shadow-sm' : 'text-gray-50'} rounded-lg py-1.5 px-6 font-medium`}
      onClick={onClick}
    >
      {text}
    </button>
  );
}

function Price({
  bytes,
  amount,
  interval,
  button,
  className = '',
  onClick,
  disabled,
  loading,
}: DisplayPrice & {
  button: 'change' | 'current' | 'upgrade';
  onClick?: () => void;
  className?: string;
  disabled: boolean;
  loading: boolean;
}): JSX.Element {
  let amountMonthly: number | null = null;
  let amountAnnually: number | null = null;
  const { translate } = useTranslationContext();

  if (interval === 'month') {
    amountMonthly = amount;
    amountAnnually = amount * 12;
  } else if (interval === 'year') {
    amountMonthly = amount / 12;
    amountAnnually = amount;
  }

  function displayAmount(value) {
    return (value / 100).toFixed(2);
  }

  const displayButtonText =
    button === 'change'
      ? translate('actions.change')
      : button === 'current'
      ? translate('drive.currentPlan')
      : translate('actions.upgrade');

  return (
    <div className={`${className} w-full rounded-xl border border-gray-10 p-6 lg:w-64`}>
      <h1 className="text-4xl font-medium text-primary">{bytesToString(bytes)}</h1>
      <div className="border-translate mt-5 border-gray-10" />
      <p className="mt-5 text-2xl font-medium text-gray-100">
        {interval === 'lifetime'
          ? translate('views.account.tabs.plans.card.lifetime', {
              amount: displayAmount(amount),
            })
          : translate('views.account.tabs.plans.card.monthly', {
              amount: displayAmount(amountMonthly),
            })}
      </p>
      {interval !== 'lifetime' && (
        <p className=" text-gray-50">
          {translate('views.account.tabs.plans.card.annually', {
            amount: displayAmount(amountAnnually),
          })}
        </p>
      )}
      <Button
        loading={loading}
        onClick={onClick}
        disabled={button === 'current' || disabled}
        variant="primary"
        className="mt-5 w-full"
      >
        {displayButtonText}
      </Button>
    </div>
  );
}
