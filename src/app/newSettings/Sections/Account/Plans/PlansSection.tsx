import { DisplayPrice } from '@internxt/sdk/dist/drive/payments/types';
import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import Section from 'app/core/views/Preferences/components/Section';
import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import errorService from '../../../../core/services/error.service';
import navigationService from '../../../../core/services/navigation.service';
import { bytesToString } from '../../../../drive/services/size.service';
import { useTranslationContext } from '../../../../i18n/provider/TranslationProvider';
import notificationsService, { ToastType } from '../../../../notifications/services/notifications.service';
import moneyService from '../../../../payment/services/money.service';
import paymentService from '../../../../payment/services/payment.service';
import { RootState } from '../../../../store';
import { useAppDispatch } from '../../../../store/hooks';
import { PlanState, planThunks } from '../../../../store/slices/plan';
import ChangePlanDialog from './components/ChangePlanDialog';
import PlanCard from './components/PlanCard';
import PlanSelectionCard from './components/PlanSelectionCard';
import IntervalSwitch from './components/TabButton';
import { displayAmount, getStripe } from './planUtils';

const WEBSITE_BASE_URL = process.env.REACT_APP_WEBSITE_URL;
const productValue = {
  US: 'usd',
};

const freePlanData = {
  amount: 0,
  bytes: 2147483648,
  id: 'free',
  currency: 'Free forever',
  interval: 'month',
} as DisplayPrice;

interface PlansSectionProps {
  changeSection: ({ section, subsection }) => void;
}

const PlansSection = ({ changeSection }: PlansSectionProps) => {
  const { translate } = useTranslationContext();
  const dispatch = useAppDispatch();

  const plan = useSelector<RootState, PlanState>((state) => state.plan);
  const { subscription } = plan;
  const currentPlan = plan.individualPlan;
  const currentPlanPayPeriod = currentPlan?.renewalPeriod === 'monthly' ? 'month' : 'year';
  const user = useSelector<RootState, UserSettings | undefined>((state) => state.user.user);
  if (user === undefined) throw new Error('User is not defined');

  const [prices, setPrices] = useState<DisplayPrice[]>([]);
  const [interval, setInterval] = useState<DisplayPrice['interval']>(
    subscription?.type === 'free' ? 'year' : currentPlanPayPeriod,
  );

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [priceSelected, setPriceSelected] = useState<DisplayPrice>(freePlanData);

  const getCurrentPlanType = () => {
    const isSubscription = priceSelected?.interval === 'month' || priceSelected?.interval === 'year';

    if (subscription?.type === 'free' && priceSelected?.id === 'free') {
      return 'free';
    }

    if (isSubscription) {
      const currentStorage = parseInt(currentPlan?.storageLimit.toString() ?? '0');
      if (currentStorage < priceSelected?.bytes) {
        return 'upgrade';
      }
      if (currentStorage > priceSelected?.bytes) {
        return 'downgrade';
      }
      if (currentStorage === priceSelected?.bytes) {
        return 'manageBilling';
      }

      return 'free';
    }

    if (priceSelected?.interval === 'lifetime') {
      return 'manageBilling';
    }

    return 'free';
  };

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

  useEffect(() => {
    stripe = getStripe(stripe);
  }, []);

  const pricesFilteredAndSorted = prices
    ?.filter((price) => price.interval === interval)
    .sort((a, b) => a.amount - b.amount);

  const [loadingPlanAction, setLoadingPlanAction] = useState<string | null>(null);

  const createCheckoutSession = async ({
    priceId,
    mode,
    currency,
  }: {
    priceId: string;
    mode: string;
    currency: string;
  }) => {
    return paymentService.createCheckoutSession({
      price_id: priceId,
      success_url: `${window.location.origin}/checkout/success`,
      cancel_url: `${window.location.origin}/checkout/cancel?price_id=${priceId}`,
      customer_email: user.email,
      mode: mode,
      currency: currency,
    });
  };

  // TODO: REFACTOR
  const onPlanClick = async (priceId: string, currency: string) => {
    setLoadingPlanAction(priceId);

    if (subscription?.type !== 'subscription') {
      try {
        const response = await createCheckoutSession({
          priceId,
          currency,
          mode: interval === 'lifetime' ? 'payment' : 'subscription',
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
          const response = await createCheckoutSession({
            priceId,
            currency,
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
          // recheck stripe2 name
          const stripe2 = await getStripe(stripe);
          const updatedSubscription = await paymentService.updateSubscriptionPrice(priceId);
          if (updatedSubscription.request3DSecure) {
            stripe2
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
  };

  const onPlanSelected = (price: DisplayPrice) => {
    setPriceSelected(price);
    setIsDialogOpen(true);
  };
  const currentPlanType = getCurrentPlanType();

  return (
    <Section title="Plans" className="flex max-h-640 flex-1 flex-col space-y-6 overflow-y-auto p-6">
      {prices && priceSelected && (
        <ChangePlanDialog
          prices={prices}
          isDialgOpen={isDialogOpen}
          setIsDialogOpen={setIsDialogOpen}
          onPlanClick={onPlanClick}
          priceIdSelected={priceSelected.id}
        />
      )}

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
      <div className="flex flex-row justify-between ">
        <div className="-mb-1 flex flex-col space-y-2">
          <PlanSelectionCard
            key={freePlanData.id}
            onClick={() => setPriceSelected(freePlanData)}
            isSelected={priceSelected?.id === freePlanData.id}
            capacity={bytesToString(freePlanData.bytes)}
            currency={freePlanData.currency}
            amount={''}
            billing={''}
            isCurrentPlan={freePlanData.id === subscription?.type}
          />
          {pricesFilteredAndSorted.map((plan) => (
            <PlanSelectionCard
              key={plan.id}
              onClick={() => setPriceSelected(plan)}
              isSelected={priceSelected?.id === plan.id}
              capacity={bytesToString(plan.bytes)}
              currency={moneyService.getCurrencySymbol(plan.currency.toUpperCase())}
              amount={displayAmount(plan.amount)}
              billing={plan.interval}
              isCurrentPlan={subscription?.priceId === plan.id}
            />
          ))}
        </div>
        {priceSelected?.id === freePlanData.id ? (
          <PlanCard
            onClick={() => {
              if (currentPlanType === 'free') {
                navigationService.openPreferencesDialog({ section: 'account', subsection: 'account' });
                changeSection({ section: 'account', subsection: 'account' });
              } else {
                onPlanSelected(priceSelected);
              }
            }}
            isCurrentPlan={freePlanData.id === subscription?.type}
            capacity={bytesToString(priceSelected?.bytes ?? 0)}
            currency={'Free forever'}
            price={''}
            billing={''}
            changePlanType={currentPlanType}
          />
        ) : (
          <PlanCard
            onClick={() => onPlanSelected(priceSelected)}
            isCurrentPlan={subscription?.priceId === priceSelected.id}
            capacity={bytesToString(priceSelected?.bytes ?? 0)}
            currency={
              priceSelected?.currency ? moneyService.getCurrencySymbol(priceSelected?.currency) : 'Free forever'
            }
            price={priceSelected ? displayAmount(priceSelected.amount) : '0'}
            billing={priceSelected ? priceSelected.interval : ''}
            changePlanType={currentPlanType}
          />
        )}
      </div>
    </Section>
  );
};

export default PlansSection;
