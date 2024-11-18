import { t } from 'i18next';
import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';

import { RootState } from 'app/store';
import { PlanState, planThunks } from 'app/store/slices/plan';

import { CustomerBillingInfo, UserType } from '@internxt/sdk/dist/drive/payments/types';
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
import { UpdateMembersCard } from './UpdateMembersCard';
import { UpdateMembersModal } from './components/UpdateMembers/UpdateMembersModal';
import { ConfirmUpdateMembersModal } from './components/UpdateMembers/ConfirmUpdateMembersModal';
import AppError from 'app/core/types';
import errorService from 'app/core/services/error.service';
import workspacesService from 'app/core/services/workspace.service';
import { WorkspaceUser } from '@internxt/sdk/dist/workspaces';

interface BillingWorkspaceSectionProps {
  changeSection: ({ section, subsection }) => void;
  onClosePreferences: () => void;
}

const UPDATE_MEMBERS_BAD_RESPONSE = 400;

const BillingWorkspaceSection = ({ onClosePreferences }: BillingWorkspaceSectionProps) => {
  const dispatch = useAppDispatch();
  const { translate } = useTranslationContext();
  const plan = useSelector<RootState, PlanState>((state) => state.plan);
  const user = useSelector((state: RootState) => state.user.user) as UserSettings;
  const { selectedWorkspace } = useSelector<RootState, WorkspacesState>((state) => state.workspaces);
  const workspaceId = selectedWorkspace?.workspace.id;
  const isOwner = user.uuid === selectedWorkspace?.workspace.ownerId;
  const subscriptionId = plan.businessSubscription?.type === 'subscription' && plan.businessSubscription.subscriptionId;

  const [isSubscription, setIsSubscription] = useState<boolean>(false);
  const [cancellingSubscription, setCancellingSubscription] = useState<boolean>(false);
  const [isCancelSubscriptionModalOpen, setIsCancelSubscriptionModalOpen] = useState<boolean>(false);
  const [planName, setPlanName] = useState<string>('');
  const [planInfo, setPlanInfo] = useState<string>('');
  const [currentUsage, setCurrentUsage] = useState<number>(-1);
  const [updatedAmountOfSeats, setUpdatedAmountOfSeats] = useState<number | undefined>(
    plan.businessPlan?.amountOfSeats,
  );
  const [joinedMembersInWorkspace, setJoinedMembersInWorkspace] = useState<WorkspaceUser[]>();

  const [isEditingMembersWorkspace, setIsEditingMembersWorkspace] = useState(false);
  const [isConfirmingMembersWorkspace, setIsConfirmingMembersWorkspace] = useState(false);
  const [isEditingBillingDetails, setIsEditingBillingDetails] = useState(false);
  const [isSavingBillingDetails, setIsSavingBillingDetails] = useState(false);
  const [billingDetails, setBillingDetails] = useState<CustomerBillingInfo>({
    address: selectedWorkspace?.workspace.address || '',
    phoneNumber: selectedWorkspace?.workspace.phoneNumber || '',
  });

  useEffect(() => {
    plan.businessSubscription?.type === 'subscription' ? setIsSubscription(true) : setIsSubscription(false);
    getJoinedMembers();
    setPlanName(getPlanName(plan.businessPlan, plan.businessPlanLimit));
    setPlanInfo(getPlanInfo(plan.businessPlan));
    setCurrentUsage(plan.businessPlanUsageDetails?.total ?? -1);
  }, [plan.businessSubscription]);

  const getJoinedMembers = async () => {
    if (!workspaceId) return;

    const members = await workspacesService.getWorkspacesMembers(workspaceId);
    setJoinedMembersInWorkspace([...members.activatedUsers, ...members.disabledUsers]);
  };

  const cancelSubscription = async (feedback: string) => {
    setCancellingSubscription(true);
    try {
      await paymentService.cancelSubscription(UserType.Business);
      notificationsService.show({ text: translate('notificationMessages.successCancelSubscription'), duration: 8000 });
      setIsCancelSubscriptionModalOpen(false);
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
  };

  const onSaveBillingDetails = (newBillingDetails: CustomerBillingInfo) => {
    if (workspaceId) {
      setIsSavingBillingDetails(true);
      dispatch(workspaceThunks.editWorkspace({ workspaceId, details: newBillingDetails })).then((data) => {
        const isUpdateSuccessful = data.payload;
        if (isUpdateSuccessful) {
          setBillingDetails(newBillingDetails);
        }
      });
      setIsSavingBillingDetails(false);
      setIsEditingBillingDetails(false);
    }
  };

  const onChangeWorkspaceMembers = (updatedMembers: number) => {
    setUpdatedAmountOfSeats(updatedMembers);
  };

  const onCloseChangeMembersModal = () => {
    setIsEditingMembersWorkspace(false);
    setUpdatedAmountOfSeats(plan.businessPlan?.amountOfSeats);
  };

  const onCloseConfirmUpdatedMembersModal = () => {
    setIsEditingMembersWorkspace(false);
    setIsConfirmingMembersWorkspace(false);
    setUpdatedAmountOfSeats(plan.businessPlan?.amountOfSeats);
  };

  const onSaveChanges = () => {
    setIsEditingMembersWorkspace(false);
    if (plan.businessPlan?.amountOfSeats === updatedAmountOfSeats) return;
    setIsConfirmingMembersWorkspace(true);
  };

  const onConfirmUpdatedMembers = async () => {
    if (
      !subscriptionId ||
      !updatedAmountOfSeats ||
      (joinedMembersInWorkspace && updatedAmountOfSeats < joinedMembersInWorkspace?.length)
    ) {
      notificationsService.show({
        text: translate('notificationMessages.errorWhileUpdatingWorkspaceMembers'),
        type: ToastType.Error,
      });
      return;
    }

    try {
      await paymentService.updateWorkspaceMembers(subscriptionId, updatedAmountOfSeats);

      await dispatch(planThunks.fetchBusinessLimitUsageThunk());
      setTimeout(async () => {
        await dispatch(
          planThunks.fetchSubscriptionThunk({
            userType: UserType.Business,
          }),
        );
      }, 500);
      notificationsService.show({
        text: translate('notificationMessages.membersUpdatedSuccessfully'),
        type: ToastType.Success,
      });
      setIsConfirmingMembersWorkspace(false);
    } catch (err) {
      const error = err as AppError;
      if (error.status === UPDATE_MEMBERS_BAD_RESPONSE) {
        notificationsService.show({
          text: error.message,
          type: ToastType.Error,
        });
      } else {
        notificationsService.show({
          text: translate('notificationMessages.errorWhileUpdatingWorkspaceMembers'),
          type: ToastType.Error,
        });
      }

      errorService.reportError(error);
    }
  };

  return (
    <Section title={t('preferences.workspace.billing.title')} onClosePreferences={onClosePreferences}>
      <BillingWorkspaceOverview plan={plan} />
      <UpdateMembersCard
        plan={plan}
        translate={translate}
        onChangeMembersButtonClicked={() => setIsEditingMembersWorkspace(true)}
      />
      <UpdateMembersModal
        isOpen={isEditingMembersWorkspace}
        plan={plan}
        joinedUsers={joinedMembersInWorkspace?.length}
        updatedAmountOfSeats={updatedAmountOfSeats}
        onSaveChanges={onSaveChanges}
        handleUpdateMembers={onChangeWorkspaceMembers}
        onClose={onCloseChangeMembersModal}
        translate={translate}
      />
      <ConfirmUpdateMembersModal
        isOpen={isConfirmingMembersWorkspace}
        plan={plan}
        updatedAmountOfSeats={updatedAmountOfSeats as number}
        translate={translate}
        onConfirmUpdate={onConfirmUpdatedMembers}
        onClose={onCloseConfirmUpdatedMembersModal}
      />
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
