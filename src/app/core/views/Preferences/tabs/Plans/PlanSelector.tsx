import { DisplayPrice } from '@internxt/sdk/dist/drive/payments/types';
import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import { Stripe, loadStripe } from '@stripe/stripe-js';
import envService from 'app/core/services/env.service';
import errorService from 'app/core/services/error.service';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import moneyService from 'app/payment/services/money.service';
import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { bytesToString } from '../../../../../drive/services/size.service';
import ChangePlanDialog from '../../../../../newSettings/Sections/Account/Plans/components/ChangePlanDialog';
import notificationsService, { ToastType } from '../../../../../notifications/services/notifications.service';
import paymentService from '../../../../../payment/services/payment.service';
import Button from '../../../../../shared/components/Button/Button';
import { RootState } from '../../../../../store';
import { useAppDispatch } from '../../../../../store/hooks';
import { PlanState, planThunks } from '../../../../../store/slices/plan';

const WEBSITE_BASE_URL = process.env.REACT_APP_WEBSITE_URL;

const productValue = {
  US: 'usd',
};

export default function PlanSelector({ className = '' }: { className?: string }): JSX.Element {
  const dispatch = useAppDispatch();
  const { translate } = useTranslationContext();

  const plan = useSelector<RootState, PlanState>((state) => state.plan);
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const user = useSelector<RootState, UserSettings>((state) => state.user.user!);
  if (user === undefined) throw new Error('User is not defined');

  const { subscription } = plan;

  const priceButtons = subscription?.type === 'subscription' ? 'change' : 'upgrade';

  const [prices, setPrices] = useState<DisplayPrice[]>([]);
  const [interval, setInterval] = useState<DisplayPrice['interval']>('year');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [priceIdSelected, setPriceIdSelected] = useState('');

  useEffect(() => {
    const app = fetch(`${WEBSITE_BASE_URL}/api/get_country`, {
      method: 'GET',
    });

    app
      .then((res) => res.json())
      .then(({ country }) => {
        const currencyValue = productValue[country] ?? 'eur';
        paymentService.getPrices(currencyValue).then(setPrices);
      })
      .catch((error) => {
        console.error(error);
        paymentService
          .getPrices('eur')
          .then(setPrices)
          .catch((err) => {
            const error = errorService.castError(err);
            errorService.reportError(error);
          });
      });
  }, []);

  let stripe;

  async function getStripe(): Promise<Stripe> {
    if (!stripe) {
      stripe = (await loadStripe(
        envService.isProduction() ? process.env.REACT_APP_STRIPE_PK : process.env.REACT_APP_STRIPE_TEST_PK,
      )) as Stripe;
    }

    return stripe;
  }

  const pricesFilteredAndSorted = prices
    ?.filter((price) => price.interval === interval)
    .sort((a, b) => a.amount - b.amount);
  console.log({ pricesFilteredAndSorted });
  const [loadingPlanAction, setLoadingPlanAction] = useState<string | null>(null);

  async function onPlanClick(priceId: string, currency: string) {
    setLoadingPlanAction(priceId);

    if (subscription?.type !== 'subscription') {
      try {
        const response = await paymentService.createCheckoutSession({
          price_id: priceId,
          success_url: `${window.location.origin}/checkout/success`,
          cancel_url: `${window.location.origin}/checkout/cancel?price_id=${priceId}`,
          customer_email: user.email,
          mode: interval === 'lifetime' ? 'payment' : 'subscription',
          currency: currency,
        });
        localStorage.setItem('sessionId', response.sessionId);
        await paymentService.redirectToCheckout(response);
      } catch (err) {
        const error = errorService.castError(err);
        notificationsService.show({
          text: translate('notificationMessages.errorCancelSubscription'),
          type: ToastType.Error,
        });
        errorService.reportError(error);
      } finally {
        setLoadingPlanAction(null);
        setIsDialogOpen(false);
      }
    } else {
      if (interval === 'lifetime') {
        try {
          const response = await paymentService.createCheckoutSession({
            price_id: priceId,
            success_url: `${window.location.origin}/checkout/success`,
            cancel_url: `${window.location.origin}/checkout/cancel?price_id=${priceId}`,
            customer_email: user.email,
            mode: 'payment',
            currency: currency,
          });
          localStorage.setItem('sessionId', response.sessionId);
          await paymentService.redirectToCheckout(response).then(async (result) => {
            await paymentService.cancelSubscription();
            if (result.error) {
              notificationsService.show({
                type: ToastType.Error,
                text: result.error.message as string,
              });
            } else {
              notificationsService.show({
                type: ToastType.Success,
                text: 'Payment successful',
              });
            }
          });
        } catch (err) {
          const error = errorService.castError(err);
          errorService.reportError(error);
          notificationsService.show({
            text: translate('notificationMessages.errorCancelSubscription'),
            type: ToastType.Error,
          });
        }
      } else {
        try {
          const stripe = await getStripe();
          const updatedSubscription = await paymentService.updateSubscriptionPrice(priceId);
          if (updatedSubscription.request3DSecure) {
            stripe
              .confirmCardPayment(updatedSubscription.clientSecret)
              .then(async (result) => {
                if (result.error) {
                  notificationsService.show({
                    type: ToastType.Error,
                    text: result.error.message as string,
                  });
                } else {
                  notificationsService.show({ text: 'Subscription updated successfully', type: ToastType.Success });
                  dispatch(planThunks.initializeThunk()).unwrap();
                }
              })
              .catch((err) => {
                const error = errorService.castError(err);
                errorService.reportError(error);
                notificationsService.show({
                  text: translate('notificationMessages.errorCancelSubscription'),
                  type: ToastType.Error,
                });
              });
          } else {
            notificationsService.show({ text: 'Subscription updated successfully', type: ToastType.Success });
            dispatch(planThunks.initializeThunk()).unwrap();
          }
        } catch (err) {
          const error = errorService.castError(err);
          errorService.reportError(error);
          notificationsService.show({
            text: translate('notificationMessages.errorCancelSubscription'),
            type: ToastType.Error,
          });
        } finally {
          dispatch(planThunks.initializeThunk()).unwrap();
          setLoadingPlanAction(null);
          setIsDialogOpen(false);
        }
      }
    }
  }

  const onPlanSelected = (priceId: string) => {
    setPriceIdSelected(priceId);
    setIsDialogOpen(true);
  };

  return (
    <>
      {prices && (
        <ChangePlanDialog
          prices={prices}
          isDialgOpen={isDialogOpen}
          setIsDialogOpen={setIsDialogOpen}
          onPlanClick={onPlanClick}
          priceIdSelected={priceIdSelected}
        />
      )}
      <div className={`${className}`}>
        <div className="flex justify-center">
          <div className="flex flex-row rounded-lg bg-gray-5 p-0.5 text-sm">
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
        <div className="mt-5 flex flex-col justify-center gap-y-5 lg:flex-row lg:gap-x-5 lg:gap-y-0">
          {pricesFilteredAndSorted?.map((price) => (
            <Price
              key={price.id}
              {...price}
              button={
                subscription?.type === 'subscription' && subscription.priceId === price.id ? 'current' : priceButtons
              }
              onClick={() => onPlanSelected(price.id)}
              loading={loadingPlanAction === price.id}
              disabled={loadingPlanAction !== null}
              onPlanClick={() => onPlanClick(price.id, price.currency)}
              priceID={price.id}
              currency={price.currency}
            />
          ))}
        </div>
      </div>
    </>
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
      className={`${
        active ? 'bg-surface text-gray-100 shadow-sm dark:bg-gray-20' : 'text-gray-50'
      } rounded-lg px-6 py-1.5 font-medium`}
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
  onPlanClick,
  priceID,
  currency,
}: DisplayPrice & {
  button: 'change' | 'current' | 'upgrade';
  onClick?: () => void;
  className?: string;
  disabled: boolean;
  loading: boolean;
  onPlanClick: (value: string) => void;
  priceID: string;
  currency: string;
}): JSX.Element {
  let amountMonthly: number | null = null;
  let amountAnnually: number | null = null;
  const { translate } = useTranslationContext();
  const plan = useSelector<RootState, PlanState>((state) => state.plan);

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
      : translate('actions.purchasePlan');

  return (
    <div className={`${className} w-full rounded-xl border border-gray-10 p-6 dark:bg-gray-1 lg:w-64`}>
      <h1 className="text-4xl font-medium text-primary">{bytesToString(bytes)}</h1>
      <div className="border-translate mt-5 border-gray-10" />
      <p className="mt-5 text-2xl font-medium text-gray-100">
        <span>{moneyService.getCurrencySymbol(currency.toUpperCase())}</span>
        {interval === 'lifetime'
          ? translate('views.account.tabs.plans.card.lifetime', {
              amount: displayAmount(amount),
            })
          : translate('views.account.tabs.plans.card.monthly', {
              amount: displayAmount(amountMonthly),
            })}
      </p>
      {interval !== 'lifetime' ? (
        <p className=" text-gray-50">
          <span>{moneyService.getCurrencySymbol(currency.toUpperCase())}</span>
          {translate('views.account.tabs.plans.card.annually', {
            amount: displayAmount(amountAnnually),
          })}
        </p>
      ) : (
        <p className=" text-gray-50">{translate('views.account.tabs.plans.card.oneTimePayment')}</p>
      )}

      {plan.subscription?.type === 'free' ? (
        <Button
          loading={loading}
          onClick={() => onPlanClick(priceID)}
          disabled={button === 'current' || disabled}
          variant="primary"
          className="mt-5 w-full"
        >
          {displayButtonText}
        </Button>
      ) : (
        <Button
          loading={loading}
          onClick={onClick}
          disabled={button === 'current' || disabled}
          variant="primary"
          className="mt-5 w-full"
        >
          {displayButtonText}
        </Button>
      )}
    </div>
  );
}
