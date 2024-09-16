import { DisplayPrice, UserType } from '@internxt/sdk/dist/drive/payments/types';
import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import { AppView } from 'app/core/types';
import Section from 'app/newSettings/components/Section';
import { useCallback, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { trackCanceledSubscription } from '../../../../analytics/services/analytics.service';
import errorService from '../../../../core/services/error.service';
import navigationService from '../../../../core/services/navigation.service';
import { bytesToString } from '../../../../drive/services/size.service';
import { FreeStoragePlan } from '../../../../drive/types';
import { useTranslationContext } from '../../../../i18n/provider/TranslationProvider';
import notificationsService, { ToastType } from '../../../../notifications/services/notifications.service';
import moneyService from '../../../../payment/services/money.service';
import paymentService from '../../../../payment/services/payment.service';
import { RootState } from '../../../../store';
import { useAppDispatch } from '../../../../store/hooks';
import { PlanState, planThunks } from '../../../../store/slices/plan';
import CancelSubscriptionModal from '../../Workspace/Billing/CancelSubscriptionModal';
import { createCheckoutSession, fetchPlanPrices, getStripe } from './api/plansApi';
import ChangePlanDialog from './components/ChangePlanDialog';
import PlanCard from './components/PlanCard';
import PlanSelectionCard from './components/PlanSelectionCard';
import IntervalSwitch from './components/TabButton';
import {
  determineSubscriptionChangeType,
  displayAmount,
  getCurrentUsage,
  getPlanInfo,
  getPlanName,
  getRenewalPeriod,
} from './utils/planUtils';

interface PlansSectionProps {
  changeSection: ({ section, subsection }) => void;
  onClosePreferences: () => void;
}

const PlansSection = ({ changeSection, onClosePreferences }: PlansSectionProps) => {
  const { translate } = useTranslationContext();
  const dispatch = useAppDispatch();
  const FREE_PLAN_DATA = {
    amount: 0,
    bytes: FreeStoragePlan.storageLimit,
    id: 'free',
    currency: translate('preferences.account.plans.freeForever'),
    interval: 'month',
  } as DisplayPrice;

  const selectedWorkspace = useSelector((state: RootState) => state.workspaces.selectedWorkspace);
  const plan = useSelector<RootState, PlanState>((state) => state.plan);
  const user = useSelector<RootState, UserSettings | undefined>((state) => state.user.user);

  const { individualSubscription, businessSubscription } = plan;
  let stripe;

  if (user === undefined) throw new Error('User is not defined');

  const [isLoadingCheckout, setIsLoadingCheckout] = useState(false);

  const [individualPrices, setIndividualPrices] = useState<DisplayPrice[]>([]);
  const [businessPrices, setBusinessPrices] = useState<DisplayPrice[]>([]);

  const [selectedSubscription, setSelectedSubscription] = useState<UserType>(UserType.Individual);

  const isIndividualSubscriptionSelected = selectedSubscription == UserType.Individual;
  const isBusinessSubscriptionSelected = selectedSubscription == UserType.Business;

  const defaultInterval = plan.individualPlan?.renewalPeriod === 'monthly' ? 'month' : 'year';
  const [selectedInterval, setSelectedInterval] = useState<DisplayPrice['interval']>(defaultInterval);
  const [isCancelSubscriptionModalOpen, setIsCancelSubscriptionModalOpen] = useState(false);
  const [cancellingSubscription, setCancellingSubscription] = useState(false);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isUpdatingSubscription, setIsUpdatingSubscription] = useState<boolean>(false);
  const [priceSelected, setPriceSelected] = useState<DisplayPrice>(FREE_PLAN_DATA);

  const currentRenewalInterval = isIndividualSubscriptionSelected
    ? plan.individualPlan?.renewalPeriod
    : plan.businessPlan?.renewalPeriod;

  const currentChangePlanType = determineSubscriptionChangeType({
    priceSelected,
    currentUserSubscription: isIndividualSubscriptionSelected ? individualSubscription : businessSubscription,
    planLimit: isIndividualSubscriptionSelected ? plan.planLimit : plan.businessPlan?.storageLimit ?? 0,
    isFreePriceSelected: priceSelected?.id === 'free',
    currentPlanRenewalInterval: getRenewalPeriod(currentRenewalInterval),
  });

  const pricesFilteredAndSorted = (userType: UserType) =>
    userType == UserType.Individual
      ? individualPrices?.filter((price) => price.interval === selectedInterval).sort((a, b) => a.amount - b.amount)
      : businessPrices?.filter((price) => price.interval === selectedInterval).sort((a, b) => a.amount - b.amount);

  useEffect(() => {
    fetchDataAndSetPrices();

    stripe = getStripe(stripe);
  }, []);

  const handleOnPlanSelected = (price: DisplayPrice) => {
    const subs = isIndividualSubscriptionSelected ? individualSubscription : businessSubscription;
    if (subs?.type === 'free' && currentChangePlanType === 'upgrade') {
      onChangePlanClicked(price.id, price.currency);
      return;
    }

    if (currentChangePlanType === 'manageBilling' && isIndividualSubscriptionSelected) {
      navigationService.openPreferencesDialog({
        section: 'account',
        subsection: 'billing',
        workspaceUuid: selectedWorkspace?.workspaceUser.workspaceId,
      });
      changeSection({ section: 'account', subsection: 'billing' });
    } else if (currentChangePlanType === 'manageBilling' && !isIndividualSubscriptionSelected) {
      navigationService.openPreferencesDialog({
        section: 'workspace',
        subsection: 'billing',
        workspaceUuid: selectedWorkspace?.workspaceUser.workspaceId,
      });
      changeSection({ section: 'workspace', subsection: 'billing' });
    } else if (currentChangePlanType === 'free') {
      navigationService.openPreferencesDialog({
        section: 'account',
        subsection: 'account',
        workspaceUuid: selectedWorkspace?.workspaceUser.workspaceId,
      });
      changeSection({ section: 'account', subsection: 'account' });
    } else {
      setPriceSelected(price);
      setIsDialogOpen(true);
    }
  };

  const fetchDataAndSetPrices = useCallback(async () => {
    try {
      const individualPrices = await fetchPlanPrices(UserType.Individual);
      const businessPrices = await fetchPlanPrices(UserType.Business);

      setIndividualPrices(individualPrices);
      setBusinessPrices(businessPrices);
    } catch (error) {
      const errorCasted = errorService.castError(error);
      errorService.reportError(errorCasted);
    }
  }, []);

  const showCancelSubscriptionErrorNotification = useCallback(
    (errorMessage?: string) =>
      notificationsService.show({
        text: errorMessage ?? translate('notificationMessages.errorCancelSubscription'),
        type: ToastType.Error,
      }),
    [translate],
  );

  const showSuccessSubscriptionNotification = useCallback(
    () => notificationsService.show({ text: 'Subscription updated successfully', type: ToastType.Success }),
    [translate],
  );

  const handlePaymentSuccess = () => {
    showSuccessSubscriptionNotification();
    setTimeout(() => dispatch(planThunks.initializeThunk()).unwrap(), 2000);
  };

  const handleSubscriptionPayment = async (priceId: string) => {
    try {
      stripe = await getStripe(stripe);
      const updatedSubscription = await paymentService.updateSubscriptionPrice({
        priceId,
        userType: selectedSubscription,
      });

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
              handlePaymentSuccess();
            }
          })
          .catch((err) => {
            const error = errorService.castError(err);
            errorService.reportError(error);
            showCancelSubscriptionErrorNotification(error.message);
          });
      } else {
        handlePaymentSuccess();
      }
    } catch (err) {
      const error = errorService.castError(err);
      errorService.reportError(error);
      showCancelSubscriptionErrorNotification(error.message);
    }
  };

  const handleCheckoutSession = async ({
    priceId,
    currency,
    userEmail,
    mode,
  }: {
    userEmail: string;
    priceId: string;
    mode: string;
    currency: string;
  }) => {
    try {
      const response = await createCheckoutSession({ userEmail, priceId, currency, mode });
      localStorage.setItem('sessionId', response.sessionId);
      await paymentService.redirectToCheckout(response);
    } catch (err) {
      const error = errorService.castError(err);
      errorService.reportError(error);
      showCancelSubscriptionErrorNotification();
    }
  };

  const onChangePlanClicked = async (priceId: string, currency: string) => {
    setIsLoadingCheckout(true);
    setIsUpdatingSubscription(true);
    const isLifetimeIntervalSelected = selectedInterval === 'lifetime';
    const isCurrentPlanTypeSubscription = isIndividualSubscriptionSelected
      ? individualSubscription?.type === 'subscription'
      : businessSubscription?.type === 'subscription';

    if (!isCurrentPlanTypeSubscription || isLifetimeIntervalSelected) {
      onClosePreferences();
      navigationService.push(AppView.Checkout, {
        planId: priceId,
        currency: currency,
      });
      setIsDialogOpen(false);
    } else {
      await handleSubscriptionPayment(priceId);
      setIsDialogOpen(false);
    }
    setIsLoadingCheckout(false);
    setIsUpdatingSubscription(false);
  };

  async function cancelSubscription(feedback: string) {
    setCancellingSubscription(true);
    try {
      await paymentService.cancelSubscription(selectedSubscription);
      notificationsService.show({ text: translate('notificationMessages.successCancelSubscription') });
      setIsCancelSubscriptionModalOpen(false);
      trackCanceledSubscription({ feedback });
    } catch (error) {
      errorService.reportError(error);
      notificationsService.show({
        text: translate('notificationMessages.errorCancelSubscription'),
        type: ToastType.Error,
      });
    } finally {
      setCancellingSubscription(false);
      setTimeout(() => {
        dispatch(planThunks.initializeThunk()).unwrap();
      }, 1000);
    }
  }

  const shouldDisplayChangePlanDialog = () =>
    (isIndividualSubscriptionSelected &&
      plan.individualPlan?.planId != priceSelected.id &&
      individualPrices.find((p) => p.id == priceSelected.id)) ||
    (!isIndividualSubscriptionSelected &&
      plan.businessPlan?.planId != priceSelected.id &&
      businessPrices.find((p) => p.id == priceSelected.id));

  const getDefaultPlanPrice = (userType: UserType): DisplayPrice | undefined => {
    const planId = userType === UserType.Individual ? plan.individualPlan?.planId : plan.businessPlan?.planId;

    const price =
      userType === UserType.Individual
        ? individualPrices.find((i) => i.id == planId)
        : businessPrices.find((i) => i.id == planId);
    if (price) return price;

    const intervalPrice =
      userType === UserType.Individual
        ? individualPrices.filter((p) => p.interval == selectedInterval)[0]
        : businessPrices.filter((p) => p.interval == selectedInterval)[0];
    if (intervalPrice) return intervalPrice;

    const firstPrice = userType === UserType.Individual ? individualPrices[0] : businessPrices[0];
    if (firstPrice) setSelectedInterval(firstPrice.interval);
    return firstPrice;
  };

  const handleSubscriptionInterval = (userType: UserType) => {
    if (userType !== selectedSubscription) {
      setSelectedSubscription(userType);
      const price = getDefaultPlanPrice(userType);
      if (price) setPriceSelected(price);
    }
  };

  return (
    <Section title="Plans" onClosePreferences={onClosePreferences}>
      {shouldDisplayChangePlanDialog() && priceSelected && (
        <ChangePlanDialog
          prices={isIndividualSubscriptionSelected ? individualPrices : businessPrices}
          isDialogOpen={isDialogOpen}
          setIsDialogOpen={setIsDialogOpen}
          onPlanClick={onChangePlanClicked}
          isUpdatingSubscription={isUpdatingSubscription}
          priceIdSelected={priceSelected.id}
          subscriptionSelected={selectedSubscription}
          isLoading={isLoadingCheckout}
        />
      )}
      <div className="flex flex-col">
        <div className="mb-2 flex justify-center">
          <div className="flex flex-row rounded-lg bg-gray-5 p-0.5 text-sm">
            <IntervalSwitch
              active={isIndividualSubscriptionSelected}
              text={translate('general.workspaces.personal')}
              onClick={() => handleSubscriptionInterval(UserType.Individual)}
            />
            <IntervalSwitch
              active={!isIndividualSubscriptionSelected}
              text={translate('general.workspaces.business')}
              onClick={() => handleSubscriptionInterval(UserType.Business)}
            />
          </div>
        </div>
        <div className="flex justify-center">
          <div className="flex flex-row rounded-lg bg-gray-5 p-0.5 text-sm">
            <IntervalSwitch
              active={selectedInterval === 'month'}
              text={translate('general.renewal.monthly')}
              onClick={() => setSelectedInterval('month')}
            />
            <IntervalSwitch
              active={selectedInterval === 'year'}
              text={translate('general.renewal.annually')}
              onClick={() => setSelectedInterval('year')}
            />
            {isIndividualSubscriptionSelected && (
              <IntervalSwitch
                active={selectedInterval === 'lifetime'}
                text={translate('general.renewal.lifetime')}
                onClick={() => setSelectedInterval('lifetime')}
              />
            )}
          </div>
        </div>
      </div>
      <div className="flex flex-row space-x-6">
        <div className="flex flex-1 flex-col items-stretch space-y-2.5">
          {isIndividualSubscriptionSelected && individualPrices && (
            <PlanSelectionCard
              key={FREE_PLAN_DATA.id}
              onClick={() => setPriceSelected(FREE_PLAN_DATA)}
              isSelected={priceSelected?.id === FREE_PLAN_DATA.id}
              capacity={bytesToString(FREE_PLAN_DATA.bytes)}
              currency={FREE_PLAN_DATA.currency}
              amount={''}
              billing={''}
              isCurrentPlan={FREE_PLAN_DATA.id === individualSubscription?.type}
            />
          )}
          {pricesFilteredAndSorted(selectedSubscription).map((plan) => (
            <PlanSelectionCard
              key={plan.id}
              onClick={() => setPriceSelected(plan)}
              isSelected={priceSelected?.id === plan.id}
              capacity={bytesToString(plan.bytes)}
              currency={moneyService.getCurrencySymbol(plan.currency.toUpperCase())}
              amount={displayAmount(plan.amount, plan.interval === 'lifetime' ? 0 : 2)}
              billing={
                plan.interval === 'lifetime'
                  ? translate('views.account.tabs.plans.card.oneTimePayment')
                  : translate(`preferences.account.plans.${plan.interval}`)?.toLowerCase()
              }
              isCurrentPlan={
                isIndividualSubscriptionSelected
                  ? individualSubscription?.type === 'subscription' && individualSubscription?.priceId === plan.id
                  : businessSubscription?.type === 'subscription' && businessSubscription?.priceId === plan.id
              }
              displayBillingSlash={plan.interval !== 'lifetime'}
              isBusiness={isBusinessSubscriptionSelected}
            />
          ))}
        </div>
        {priceSelected?.id === FREE_PLAN_DATA.id ? (
          <PlanCard
            onClick={() => setIsCancelSubscriptionModalOpen(true)}
            isCurrentPlan={FREE_PLAN_DATA.id === individualSubscription?.type}
            capacity={bytesToString(priceSelected?.bytes ?? 0)}
            currency={translate('preferences.account.plans.freeForever')}
            price={''}
            billing={''}
            changePlanType={currentChangePlanType}
            isLoading={isLoadingCheckout}
            disableActionButton={false}
          />
        ) : (
          <PlanCard
            onClick={() => handleOnPlanSelected(priceSelected)}
            isCurrentPlan={
              isIndividualSubscriptionSelected
                ? individualSubscription?.type === 'subscription' &&
                  individualSubscription?.priceId === priceSelected.id
                : businessSubscription?.type === 'subscription' && businessSubscription?.priceId === priceSelected.id
            }
            capacity={bytesToString(priceSelected?.bytes ?? 0)}
            currency={
              priceSelected?.currency
                ? moneyService.getCurrencySymbol(priceSelected?.currency)
                : translate('preferences.account.plans.freeForever')
            }
            price={priceSelected ? displayAmount(priceSelected.amount) : '0'}
            billing={
              priceSelected ? translate(`preferences.account.plans.${priceSelected.interval}`).toLowerCase() : ''
            }
            changePlanType={currentChangePlanType}
            isLoading={isLoadingCheckout}
            disableActionButton={false}
            isBusiness={isBusinessSubscriptionSelected}
          />
        )}
      </div>

      <CancelSubscriptionModal
        isOpen={isCancelSubscriptionModalOpen}
        onClose={() => {
          setIsCancelSubscriptionModalOpen(false);
        }}
        cancellingSubscription={cancellingSubscription}
        cancelSubscription={cancelSubscription}
        currentPlanName={
          isIndividualSubscriptionSelected
            ? getPlanName(plan.individualPlan || plan.teamPlan, plan.planLimit)
            : getPlanName(plan.businessPlan, plan.businessPlanLimit)
        }
        currentPlanInfo={
          isIndividualSubscriptionSelected
            ? getPlanInfo(plan.individualPlan || plan.teamPlan)
            : getPlanInfo(plan.businessPlan)
        }
        currentUsage={
          isIndividualSubscriptionSelected
            ? getCurrentUsage(plan.usageDetails)
            : getCurrentUsage(plan.businessPlanUsageDetails)
        }
        userType={selectedSubscription}
      />
    </Section>
  );
};

export default PlansSection;
