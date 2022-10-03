import { DisplayPrice } from '@internxt/sdk/dist/drive/payments/types';
import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
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

  const plan = useSelector<RootState, PlanState>((state) => state.plan);
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const user = useSelector<RootState, UserSettings>((state) => state.user.user!);
  if (user === undefined) throw new Error('User is not defined');

  const { subscription } = plan;

  const priceButtons = subscription?.type === 'subscription' ? 'change' : 'upgrade';

  const [prices, setPrices] = useState<DisplayPrice[] | null>(null);
  const [interval, setInterval] = useState<'month' | 'year'>('year');

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
        });
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
        <div className="relative flex h-9 w-56 rounded-lg bg-gray-5">
          <div
            className={`absolute h-full w-1/2 transform p-0.5 transition-transform ${
              interval === 'month' ? 'translate-x-0' : 'translate-x-full'
            }`}
          >
            <div className="h-full w-full rounded-lg bg-white" />
          </div>
          <IntervalSwitch active={interval === 'month'} text="Monthly" onClick={() => setInterval('month')} />
          <IntervalSwitch active={interval === 'year'} text="Annually" onClick={() => setInterval('year')} />
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
      className={`${active ? 'text-gray-100' : 'text-gray-50'} relative h-full w-1/2 font-medium`}
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
  let amountMonthly: number;
  let amountAnnually: number;

  if (interval === 'month') {
    amountMonthly = amount;
    amountAnnually = amount * 12;
  } else {
    amountMonthly = amount / 12;
    amountAnnually = amount;
  }

  function displayAmount(value) {
    return (value / 100).toFixed(2);
  }

  const displayButtonText = button === 'change' ? 'Change' : button === 'current' ? 'Current plan' : 'Upgrade';

  return (
    <div className={`${className} w-full rounded-xl border border-gray-10 p-6 lg:w-64`}>
      <h1 className="text-4xl font-medium text-primary">{bytesToString(bytes)}</h1>
      <div className="mt-5 border-t border-gray-10" />
      <p className="mt-5 text-2xl font-medium text-gray-100">{`€${displayAmount(amountMonthly)} per month`}</p>
      <p className=" text-gray-50">{`€${displayAmount(amountAnnually)} billed annually`}</p>
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
