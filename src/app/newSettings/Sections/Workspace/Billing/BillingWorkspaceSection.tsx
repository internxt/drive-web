import { t } from 'i18next';
import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';

import { RootState } from 'app/store';
import { PlanState, planThunks } from 'app/store/slices/plan';

import { CustomerBillingInfo, UserType } from '@internxt/sdk/dist/drive/payments/types';
import { trackCanceledSubscription } from 'app/analytics/services/analytics.service';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import Section from 'app/newSettings/components/Section';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';
import paymentService from 'app/payment/services/payment.service';
import { useAppDispatch } from 'app/store/hooks';
import { WorkspacesState, workspaceThunks } from 'app/store/slices/workspaces/workspacesStore';
import BillingPaymentMethodCard from '../../../components/BillingPaymentMethodCard';
import Invoices from '../../../containers/InvoicesContainer';
import CancelSubscription from '../../Account/Billing/components/CancelSubscription';
import { getPlanInfo, getPlanName } from '../../Account/Plans/utils/planUtils';
import BillingDetailsCard from './BillingDetailsCard';
import EditBillingDetailsModal from './components/EditBillingDetailsModal';
import BillingWorkspaceOverview from './containers/BillingWorkspaceOverview';
import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';

interface BillingWorkspaceSectionProps {
  changeSection: ({ section, subsection }) => void;
  onClosePreferences: () => void;
}

const BillingWorkspaceSection = ({ onClosePreferences }: BillingWorkspaceSectionProps) => {
  const dispatch = useAppDispatch();
  const { translate } = useTranslationContext();
  const plan = useSelector<RootState, PlanState>((state) => state.plan);
  const user = useSelector((state: RootState) => state.user.user) as UserSettings;
  const { selectedWorkspace } = useSelector<RootState, WorkspacesState>((state) => state.workspaces);
  const workspaceId = selectedWorkspace?.workspace.id;
  const isOwner = user.uuid === selectedWorkspace?.workspace.ownerId;

  const [isSubscription, setIsSubscription] = useState<boolean>(false);
  const [cancellingSubscription, setCancellingSubscription] = useState<boolean>(false);
  const [isCancelSubscriptionModalOpen, setIsCancelSubscriptionModalOpen] = useState<boolean>(false);
  const [planName, setPlanName] = useState<string>('');
  const [planInfo, setPlanInfo] = useState<string>('');
  const [currentUsage, setCurrentUsage] = useState<number>(-1);

  const [isEditingBillingDetails, setIsEditingBillingDetails] = useState(false);
  const [isSavingBillingDetails, setIsSavingBillingDetails] = useState(false);
  const [billingDetails, setBillingDetails] = useState<CustomerBillingInfo>({
    address: selectedWorkspace?.workspace.address || '',
    phoneNumber: selectedWorkspace?.workspace.phoneNumber || '',
  });

  useEffect(() => {
    plan.businessSubscription?.type === 'subscription' ? setIsSubscription(true) : setIsSubscription(false);
    setPlanName(getPlanName(plan.businessPlan, plan.businessPlanLimit));
    setPlanInfo(getPlanInfo(plan.businessPlan));
    setCurrentUsage(plan.businessPlanUsageDetails?.total ?? -1);
  }, [plan.businessSubscription]);

  async function cancelSubscription(feedback: string) {
    setCancellingSubscription(true);
    try {
      await paymentService.cancelSubscription(UserType.Business);
      notificationsService.show({ text: translate('notificationMessages.successCancelSubscription'), duration: 8000 });
      setIsCancelSubscriptionModalOpen(false);
      trackCanceledSubscription({ feedback });
      dispatch(workspaceThunks.setSelectedWorkspace({ workspaceId: null }));
      setTimeout(() => {
        dispatch(workspaceThunks.fetchWorkspaces());
        dispatch(workspaceThunks.checkAndSetLocalWorkspace());
        dispatch(planThunks.initializeThunk());
      }, 3000);
    } catch (err) {
      console.error(err);
      notificationsService.show({
        text: translate('notificationMessages.errorCancelSubscription'),
        type: ToastType.Error,
      });
    }
  }

  const onSaveBillingDetails = (newBillingDetails: CustomerBillingInfo) => {
    if (workspaceId) {
      setIsSavingBillingDetails(true);
      dispatch(workspaceThunks.editWorkspace({ workspaceId, details: newBillingDetails })).then((data) => {
        if (data.payload) {
          setBillingDetails(newBillingDetails);
        }
      });
      setIsSavingBillingDetails(false);
      setIsEditingBillingDetails(false);
    }
  };

  return (
    <Section title={t('preferences.workspace.billing.title')} onClosePreferences={onClosePreferences}>
      <BillingWorkspaceOverview plan={plan} />
      <BillingDetailsCard
        address={billingDetails.address || ''}
        phone={billingDetails.phoneNumber || ''}
        isOwner={isOwner}
        onEditButtonClick={() => setIsEditingBillingDetails(true)}
      />
      <EditBillingDetailsModal
        isOpen={isEditingBillingDetails}
        onClose={() => setIsEditingBillingDetails(false)}
        billingDetails={billingDetails}
        onSave={onSaveBillingDetails}
        isLoading={isSavingBillingDetails}
      />
      <BillingPaymentMethodCard userType={UserType.Business} />
      {plan.businessSubscription?.type == 'subscription' && (
        <Invoices subscriptionId={plan.businessSubscription.subscriptionId} />
      )}
      {isSubscription && (
        <CancelSubscription
          isCancelSubscriptionModalOpen={isCancelSubscriptionModalOpen}
          setIsCancelSubscriptionModalOpen={setIsCancelSubscriptionModalOpen}
          cancellingSubscription={cancellingSubscription}
          cancelSubscription={cancelSubscription}
          planName={planName}
          planInfo={planInfo}
          currentUsage={currentUsage}
          userType={UserType.Business}
        />
      )}
    </Section>
  );
};

export default BillingWorkspaceSection;
