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
import { SelectNewMembersModal } from './components/UpdateMembers/SelectNewMembersModal';
import { ConfirmUpdatedMembersModal } from './components/UpdateMembers/ConfirmUpdatedMembersModal';
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
  const [newAmountOfSeats, setNewAmountOfSeats] = useState<number | undefined>(plan.businessPlan?.amountOfSeats);
  const [currentWorkspaceMembers, setCurrentWorkspaceMembers] = useState<WorkspaceUser[]>();
  const [isConfirmingMembersWorkspace, setIsConfirmingMembersWorkspace] = useState<boolean>(false);

  const [isEditingMembersWorkspace, setIsEditingMembersWorkspace] = useState(false);
  const [isConfirmingMembersWorkspaceModalOpen, setIsConfirmingMembersWorkspaceModalOpen] = useState(false);
  const [isEditingBillingDetails, setIsEditingBillingDetails] = useState(false);
  const [isSavingBillingDetails, setIsSavingBillingDetails] = useState(false);
  const [areFetchingCurrentMembers, setAreFetchingCurrentMembers] = useState<boolean>(false);
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
    try {
      setAreFetchingCurrentMembers(true);
      const members = await workspacesService.getWorkspacesMembers(workspaceId);
      setCurrentWorkspaceMembers([...members.activatedUsers, ...members.disabledUsers]);
    } catch (error) {
      errorService.reportError(error);
      notificationsService.show({
        text: translate('notificationMessages.errorWhileFetchingCurrentWorkspaceMembers'),
        type: ToastType.Error,
      });
    } finally {
      setAreFetchingCurrentMembers(false);
    }
  };

  const cancelSubscription = async () => {
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
    setNewAmountOfSeats(updatedMembers);
  };

  const onCloseChangeMembersModal = () => {
    setIsEditingMembersWorkspace(false);
    setNewAmountOfSeats(plan.businessPlan?.amountOfSeats);
  };

  const onCloseConfirmUpdatedMembersModal = () => {
    setIsEditingMembersWorkspace(false);
    setIsConfirmingMembersWorkspaceModalOpen(false);
    setNewAmountOfSeats(plan.businessPlan?.amountOfSeats);
  };

  const onSaveChanges = () => {
    setIsEditingMembersWorkspace(false);
    if (plan.businessPlan?.amountOfSeats === newAmountOfSeats) return;
    setIsConfirmingMembersWorkspaceModalOpen(true);
  };

  const onConfirmUpdatedMembers = async () => {
    if (!subscriptionId || !newAmountOfSeats || !workspaceId) {
      notificationsService.show({
        text: translate('notificationMessages.errorWhileUpdatingWorkspaceMembers'),
        type: ToastType.Error,
      });
      return;
    } else if (currentWorkspaceMembers && newAmountOfSeats < currentWorkspaceMembers?.length) {
      notificationsService.show({
        text: translate('notificationMessages.newMembersCannotBeLessThanTheExistentOnesError'),
        type: ToastType.Error,
      });
      return;
    }

    try {
      setIsConfirmingMembersWorkspace(true);
      await paymentService.updateWorkspaceMembers(workspaceId, subscriptionId, newAmountOfSeats);

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
      setIsConfirmingMembersWorkspaceModalOpen(false);
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
      {plan.businessPlan && (
        <>
          <UpdateMembersCard
            totalWorkspaceSeats={plan.businessPlan.amountOfSeats}
            translate={translate}
            areFetchingCurrentMembers={areFetchingCurrentMembers}
            onChangeMembersButtonClicked={() => setIsEditingMembersWorkspace(true)}
          />
          <SelectNewMembersModal
            isOpen={isEditingMembersWorkspace}
            plan={plan.businessPlan}
            joinedUsers={currentWorkspaceMembers?.length}
            updatedAmountOfSeats={newAmountOfSeats}
            onSaveChanges={onSaveChanges}
            handleUpdateMembers={onChangeWorkspaceMembers}
            onClose={onCloseChangeMembersModal}
            translate={translate}
          />
          <ConfirmUpdatedMembersModal
            isOpen={isConfirmingMembersWorkspaceModalOpen}
            plan={plan.businessPlan}
            isConfirmingMembersWorkspace={isConfirmingMembersWorkspace}
            updatedAmountOfSeats={newAmountOfSeats as number}
            translate={translate}
            onConfirmUpdate={onConfirmUpdatedMembers}
            onClose={onCloseConfirmUpdatedMembersModal}
          />
        </>
      )}
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
      <BillingPaymentMethodCard subscription={plan.businessSubscription?.type} userType={UserType.Business} />
      <Invoices userType={UserType.Business} />
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
