import { DisplayPrice, UserType } from '@internxt/sdk/dist/drive/payments/types/types';
import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import { AppError } from '@internxt/sdk';
import { AppView } from 'app/core/types';
import Section from '../../../Section';
import { useCallback, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import errorService from 'services/error.service';
import navigationService from 'services/navigation.service';
import { FreeStoragePlan } from 'app/drive/types';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';
import { paymentService } from 'views/Checkout/services';
import { RootState } from 'app/store';
import { useAppDispatch } from 'app/store/hooks';
import { PlanState, planThunks } from 'app/store/slices/plan';
import {
  fetchVersionLimitsThunk,
  VERSION_LIMITS_POLL_MAX_ATTEMPTS,
  VERSION_LIMITS_POLL_DELAYS,
  fileVersionsSelectors,
  fileVersionsActions,
} from 'app/store/slices/fileVersions';
import CancelSubscriptionModal from '../../Workspace/Billing/CancelSubscriptionModal';
import { fetchPlanPrices, getStripe } from '../../../../services/plansApi';
import ChangePlanDialog from './components/ChangePlanDialog';
import IntervalSwitch from './components/TabButton';
import {
  determineSubscriptionChangeType,
  getCurrentUsage,
  getPlanInfo,
  getPlanName,
  getRenewalPeriod,
} from '../../../../utils/planUtils';
import { PlanSelectionComponent } from './components/PlanSelection/PlanSelectionComponent';
import { InfoCardComponent } from './components/PlanSelection/InfoCardComponent';

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
  const versionLimits = useSelector(fileVersionsSelectors.getLimits);

  const { individualSubscription, businessSubscription } = plan;
  let stripe;

  if (user === undefined) throw new Error('User is not defined');

  const [isLoadingCheckout, setIsLoadingCheckout] = useState(false);

  const [individualPrices, setIndividualPrices] = useState<DisplayPrice[]>([]);

  const [selectedSubscriptionType, setSelectedSubscriptionType] = useState<UserType>(UserType.Individual);

  const isIndividualSubscriptionSelected = selectedSubscriptionType == UserType.Individual;

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
    planLimit: isIndividualSubscriptionSelected ? plan.planLimit : (plan.businessPlan?.storageLimit ?? 0),
    isFreePriceSelected: priceSelected?.id === 'free',
    currentPlanRenewalInterval: getRenewalPeriod(currentRenewalInterval),
  });

  const pricesFilteredAndSorted = () =>
    individualPrices?.filter((price) => price.interval === selectedInterval).sort((a, b) => a.amount - b.amount);

  useEffect(() => {
    fetchDataAndSetPrices();

    const price = getDefaultPlanPrice();
    if (price) setPriceSelected(price);

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

  const selectUserSubscriptionPlan = useCallback(
    (prices: DisplayPrice[]) => {
      if (!prices?.length) return;

      setSelectedSubscriptionType(UserType.Individual);

      if (individualSubscription?.type === 'free') {
        setPriceSelected(FREE_PLAN_DATA);
        return;
      }

      const isLifetime = individualSubscription?.type === 'lifetime';
      const interval = isLifetime ? 'lifetime' : defaultInterval;

      setSelectedInterval(interval);

      const userPlan = prices.find((p) => p.productId === individualSubscription?.productId && p.interval === interval);

      if (userPlan) {
        setPriceSelected(userPlan);
      }
    },
    [defaultInterval, individualSubscription],
  );

  const fetchDataAndSetPrices = useCallback(async () => {
    try {
      const individualPrices = await fetchPlanPrices(UserType.Individual);

      selectUserSubscriptionPlan(individualPrices);

      setIndividualPrices(individualPrices);
    } catch (error) {
      const errorCasted = errorService.castError(error);
      errorService.reportError(errorCasted);
    }
  }, []);

  const showCancelSubscriptionErrorNotification = useCallback(
    (error?: AppError) =>
      notificationsService.show({
        text: error?.message ?? translate('notificationMessages.errorCancelSubscription'),
        type: ToastType.Error,
        requestId: error?.requestId,
      }),
    [translate],
  );

  const showSuccessSubscriptionNotification = useCallback(
    () => notificationsService.show({ text: 'Subscription updated successfully', type: ToastType.Success }),
    [translate],
  );

  const pollVersionLimitsUntilChanged = useCallback(
    async (attempt = 0, previousLimits = versionLimits) => {
      if (attempt >= VERSION_LIMITS_POLL_MAX_ATTEMPTS) return;

      const delay = VERSION_LIMITS_POLL_DELAYS[attempt] || VERSION_LIMITS_POLL_DELAYS.at(-1);
      await new Promise((resolve) => setTimeout(resolve, delay));
      const result = await dispatch(fetchVersionLimitsThunk({ isSilent: true })).unwrap();

      const hasLimitsChanged =
        previousLimits?.versioning.enabled !== result.limits.versioning.enabled ||
        previousLimits?.versioning.maxFileSize !== result.limits.versioning.maxFileSize ||
        previousLimits?.versioning.retentionDays !== result.limits.versioning.retentionDays ||
        previousLimits?.versioning.maxVersions !== result.limits.versioning.maxVersions;

      if (!hasLimitsChanged) {
        await pollVersionLimitsUntilChanged(attempt + 1, previousLimits);
        return;
      }

      dispatch(fileVersionsActions.clearAllCache());
    },
    [dispatch, versionLimits],
  );

  const handlePaymentSuccess = () => {
    showSuccessSubscriptionNotification();
    setTimeout(() => {
      dispatch(planThunks.initializeThunk()).unwrap();
    }, 2000);
    pollVersionLimitsUntilChanged();
  };

  const handleSubscriptionPayment = async (priceId: string) => {
    try {
      await paymentService.updateSubscriptionWithConfirmation({
        priceId: priceId,
        userType: selectedSubscriptionType,
        onSuccess: handlePaymentSuccess,
        onError: showCancelSubscriptionErrorNotification,
      });
    } catch (err) {
      const error = errorService.castError(err);
      errorService.reportError(error);
      showCancelSubscriptionErrorNotification(error);
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

  async function cancelSubscription() {
    setCancellingSubscription(true);
    try {
      await paymentService.cancelSubscription(selectedSubscriptionType);
      notificationsService.show({ text: translate('notificationMessages.successCancelSubscription') });
      setIsCancelSubscriptionModalOpen(false);
    } catch (error) {
      const castedError = errorService.castError(error);
      errorService.reportError(error);
      notificationsService.show({
        text: translate('notificationMessages.errorCancelSubscription'),
        type: ToastType.Error,
        requestId: castedError.requestId,
      });
    } finally {
      setCancellingSubscription(false);
      setTimeout(() => {
        dispatch(planThunks.initializeThunk()).unwrap();
      }, 1000);
      pollVersionLimitsUntilChanged();
    }
  }

  const shouldDisplayChangePlanDialog = () =>
    isIndividualSubscriptionSelected &&
    plan.individualPlan?.planId != priceSelected.id &&
    individualPrices.find((p) => p.id == priceSelected.id);

  const getDefaultPlanPrice = (): DisplayPrice | undefined => {
    const planId = plan.individualPlan?.planId;

    const price = individualPrices.find((i) => i.id == planId);
    if (price) return price;

    const intervalPrice = individualPrices.find((p) => p.interval == selectedInterval);

    if (intervalPrice) return intervalPrice;

    const firstPrice = individualPrices[0];
    if (firstPrice) setSelectedInterval(firstPrice.interval);
    return firstPrice;
  };

  const handleIndividualUserCurrentSubscription = (plan: DisplayPrice) => {
    switch (individualSubscription?.type) {
      case 'free':
        return false;
      case 'subscription':
        return (
          individualSubscription?.productId === plan.productId && individualSubscription.interval === plan.interval
        );
      case 'lifetime':
        return individualSubscription.productId === plan.productId && plan.interval === 'lifetime';

      default:
        return false;
    }
  };

  const isCurrentSubscriptionPlan = (plan: DisplayPrice) => {
    return handleIndividualUserCurrentSubscription(plan);
  };

  return (
    <Section title="Plans" onClosePreferences={onClosePreferences}>
      {shouldDisplayChangePlanDialog() && priceSelected && (
        <ChangePlanDialog
          isDialogOpen={isDialogOpen}
          setIsDialogOpen={setIsDialogOpen}
          onPlanClick={onChangePlanClicked}
          isUpdatingSubscription={isUpdatingSubscription}
          priceSelected={priceSelected}
          subscriptionSelected={selectedSubscriptionType}
          isLoading={isLoadingCheckout}
        />
      )}
      <div className="flex flex-col">
        <div className="flex justify-center">
          <div className="flex flex-row rounded-lg bg-gray-5 p-0.5 text-sm">
            <IntervalSwitch
              active={selectedInterval === 'year'}
              text={translate('general.renewal.annually')}
              onClick={() => setSelectedInterval('year')}
            />
            <IntervalSwitch
              active={selectedInterval === 'lifetime'}
              text={translate('general.renewal.lifetime')}
              onClick={() => setSelectedInterval('lifetime')}
            />
          </div>
        </div>
      </div>
      <div className="flex flex-row space-x-6">
        <PlanSelectionComponent
          onPriceSelected={setPriceSelected}
          priceSelected={priceSelected}
          freePlanData={FREE_PLAN_DATA}
          pricesToRender={pricesFilteredAndSorted()}
          showFreePriceCard={isIndividualSubscriptionSelected}
          isFreePlan={FREE_PLAN_DATA.id === individualSubscription?.type}
          isCurrentSubscriptionPlan={isCurrentSubscriptionPlan}
          translate={translate}
        />

        <InfoCardComponent
          currentChangePlanType={currentChangePlanType}
          freePlanData={FREE_PLAN_DATA}
          isCurrentFreePlan={FREE_PLAN_DATA.id === individualSubscription?.type}
          isLoadingCheckout={isLoadingCheckout}
          onCancelSubscription={setIsCancelSubscriptionModalOpen}
          priceSelected={priceSelected}
          pricesToRender={pricesFilteredAndSorted()}
          isCurrentPlan={isCurrentSubscriptionPlan(priceSelected)}
          translate={translate}
          handleOnPlanSelected={handleOnPlanSelected}
        />
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
            ? getPlanName(plan.individualPlan, plan.planLimit)
            : getPlanName(plan.businessPlan, plan.businessPlanLimit)
        }
        currentPlanInfo={
          isIndividualSubscriptionSelected ? getPlanInfo(plan.individualPlan) : getPlanInfo(plan.businessPlan)
        }
        currentUsage={
          isIndividualSubscriptionSelected
            ? getCurrentUsage(plan.usageDetails)
            : getCurrentUsage(plan.businessPlanUsageDetails)
        }
        userType={selectedSubscriptionType}
      />
    </Section>
  );
};

export default PlansSection;
