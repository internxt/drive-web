import { DisplayPrice } from '@internxt/sdk/dist/drive/payments/types';
import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { ArrowRight } from 'phosphor-react';
import { bytesToString } from '../../../../../drive/services/size.service';
import notificationsService, { ToastType } from '../../../../../notifications/services/notifications.service';
import paymentService from '../../../../../payment/services/payment.service';
import Button from '../../../../../shared/components/Button/Button';
import { RootState } from '../../../../../store';
import { useAppDispatch } from '../../../../../store/hooks';
import { planActions, PlanState } from '../../../../../store/slices/plan';
import Modal from 'app/shared/components/Modal';

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
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [priceIdSelected, setPriceIdSelected] = useState('');

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
          cancel_url: `${window.location.origin}/checkout/cancel?price_id=${priceId}`,
          customer_email: user.email,
          mode: interval === 'lifetime' ? 'payment' : 'subscription',
        });
        localStorage.setItem('sessionId', response.sessionId);
        await paymentService.redirectToCheckout(response);
      } catch (err) {
        console.error(err);
        notificationsService.show({
          text: translate('notificationMessages.errorCancelSubscription'),
          type: ToastType.Error,
        });
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
        } catch (error) {
          console.error(error);
          notificationsService.show({
            text: translate('notificationMessages.errorCancelSubscription'),
            type: ToastType.Error,
          });
        }
      } else {
        try {
          const updatedSubscription = await paymentService.updateSubscriptionPrice(priceId);
          dispatch(planActions.setSubscription(updatedSubscription));
          notificationsService.show({ text: 'Subscription updated successfully', type: ToastType.Success });
        } catch (err) {
          console.error(err);
          notificationsService.show({
            text: translate('notificationMessages.errorCancelSubscription'),
            type: ToastType.Error,
          });
        } finally {
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
              onClick={() => onPlanSelected(price.id)}
              loading={loadingPlanAction === price.id}
              disabled={loadingPlanAction !== null}
              onPlanClick={onPlanClick}
              priceID={price.id}
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
  onPlanClick,
  priceID,
}: DisplayPrice & {
  button: 'change' | 'current' | 'upgrade';
  onClick?: () => void;
  className?: string;
  disabled: boolean;
  loading: boolean;
  onPlanClick: (value: string) => void;
  priceID: string;
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
      {interval !== 'lifetime' ? (
        <p className=" text-gray-50">
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

const ChangePlanDialog = ({
  prices,
  isDialgOpen,
  setIsDialogOpen,
  onPlanClick,
  priceIdSelected,
}: {
  prices: DisplayPrice[];
  isDialgOpen: boolean;
  setIsDialogOpen: (value: boolean) => void;
  onPlanClick: (value: string) => void;
  priceIdSelected: string;
}): JSX.Element => {
  const plan = useSelector<RootState, PlanState>((state) => state.plan);
  const { translate } = useTranslationContext();

  const { planLimit, planUsage, subscription } = plan;
  const selectedPlan: any = prices.find((plan) => plan.id === priceIdSelected);
  const selectedPlanSize = selectedPlan?.bytes;
  const selectedPlanSizeString = bytesToString(selectedPlanSize);
  const selectedPlanAmount = selectedPlan?.amount;
  const selectedPlanInterval = selectedPlan?.interval;
  const currentPlanSizeString = bytesToString(planLimit);

  let amountMonthly: number | null = null;
  let currentAmountMonthly: number | null = null;

  if (selectedPlanInterval === 'month') {
    amountMonthly = selectedPlanAmount;
  } else if (selectedPlanInterval === 'year') {
    amountMonthly = selectedPlanAmount / 12;
  }

  if (subscription?.type === 'subscription') {
    if (subscription.interval === 'month') {
      currentAmountMonthly = subscription.amount;
    } else if (subscription.interval === 'year') {
      currentAmountMonthly = subscription.amount / 12;
    }
  }

  const onClose = (): void => {
    setIsDialogOpen(false);
  };

  const displayAmount = (value) => {
    return (value / 100).toFixed(2);
  };

  return (
    <Modal isOpen={isDialgOpen} onClose={onClose}>
      <h3 className="mb-5 text-2xl font-medium">{translate('views.account.tabs.plans.dialog.title')}</h3>
      <p className="font-regular mb-9 text-lg">
        {translate('views.account.tabs.plans.dialog.subtitle1')}
        <span className="font-semibold">{currentPlanSizeString}</span>
        {translate('views.account.tabs.plans.dialog.subtitle2')}
        <span className="font-semibold">{selectedPlanSizeString}</span>
        {translate('views.account.tabs.plans.dialog.subtitle3')}
      </p>
      <div className="mb-9 flex items-center justify-center">
        <div className="flex w-40 flex-col items-center rounded-xl border border-gray-10 p-4 shadow-soft">
          <p className="mb-2.5 rounded-xl border border-gray-10 bg-gray-5 px-2 py-1 text-xs font-medium text-gray-80">
            {translate('views.account.tabs.plans.dialog.plan.current')}
          </p>
          <p className="text-2xl font-medium text-primary">{currentPlanSizeString}</p>
          {subscription?.type === 'subscription' ? (
            <div>
              <span className="text-base font-medium">
                {subscription.currency}
                {displayAmount(currentAmountMonthly)}
              </span>
              <span>/</span>
              <span className="text-xs font-medium">{translate('views.account.tabs.plans.dialog.plan.interval')}</span>
            </div>
          ) : (
            <p className="text-base font-medium capitalize">{subscription?.type}</p>
          )}
        </div>
        <ArrowRight className="mx-5 font-semibold text-gray-20" />
        <div className="flex w-40 flex-col items-center rounded-xl border border-gray-10 p-4 shadow-soft">
          <p className="mb-2.5 rounded-xl border border-gray-10 bg-gray-5 px-2 py-1 text-xs font-medium text-gray-80">
            {translate('views.account.tabs.plans.dialog.plan.new')}
          </p>
          <p className={`text-2xl font-medium ${selectedPlanSize < planUsage ? 'text-red-std' : 'text-primary'}`}>
            {selectedPlanSizeString}
          </p>
          {selectedPlanInterval === 'lifetime' ? (
            <div>
              <span className="text-base font-medium">{`€${displayAmount(selectedPlanAmount)}`}</span>
            </div>
          ) : (
            <div>
              <span className="text-base font-medium">{`€${displayAmount(amountMonthly)}`}</span>
              <span>/</span>
              <span className="text-xs font-medium">{translate('views.account.tabs.plans.dialog.plan.interval')}</span>
            </div>
          )}
        </div>
      </div>
      {selectedPlanSize < planUsage && (
        <div className="mb-5 flex flex-col items-center rounded-xl border border-red-30 bg-red-10 px-4 py-5 text-red-std">
          <h4 className="mb-1.5 text-center text-xl font-semibold">
            {translate('views.account.tabs.plans.dialog.alert.title')}
            {selectedPlanSizeString}
          </h4>
          <p className="font-regular text-center text-base">
            {translate('views.account.tabs.plans.dialog.alert.text1')}
            <span className="font-semibold">{bytesToString(planUsage)}</span>
            {translate('views.account.tabs.plans.dialog.alert.text2')}
          </p>
        </div>
      )}
      <div className="font-regular mb-5 rounded-xl bg-gray-1 p-4 text-center text-base">
        <p>{translate('views.account.tabs.plans.dialog.message.text')}</p>
      </div>
      <div className="flex w-full justify-end">
        <Button className="mr-2" variant="secondary" onClick={onClose}>
          {translate('views.account.tabs.plans.dialog.button.back')}
        </Button>
        <Button variant="primary" onClick={() => onPlanClick(priceIdSelected)}>
          {translate('views.account.tabs.plans.dialog.button.continue')}
        </Button>
      </div>
    </Modal>
  );
};
