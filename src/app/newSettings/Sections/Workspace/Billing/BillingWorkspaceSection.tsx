import { t } from 'i18next';
import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';

import { RootState } from 'app/store';
import { PlanState } from 'app/store/slices/plan';

import Section from '../../General/components/Section';
import BillingPaymentMethodCard from '../../../components/BillingPaymentMethodCard';
import Invoices from '../../../containers/InvoicesContainer';
import { BillingDetails } from '../../../types/types';
import BillingDetailsCard from './BillingDetailsCard';
import EditBillingDetailsModal from './components/EditBillingDetailsModal';
import BillingWorkspaceOverview from './containers/BillingWorkspaceOverview';
import { UserType } from '@internxt/sdk/dist/drive/payments/types';
import { getPlanInfo, getPlanName } from '../../Account/Plans/utils/planUtils';
import CancelSubscription from '../../Account/Billing/components/CancelSubscription';
import paymentService from 'app/payment/services/payment.service';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';
import { trackCanceledSubscription } from 'app/analytics/services/analytics.service';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import navigationService from 'app/core/services/navigation.service';

// MOCKED DATA
const address = 'La Marina de Valencia, Muelle de la Aduana s/n, La Marina de Valencia, Muelle de la Aduana s/n, Spain';
const addressOptional = '';
const postalCode = '46024';
const region = 'Valencia';
const city = 'Valencia';
const country = 'Spain';
const phone = '+34432445236';
const owner = 'Fran Villalba Segarra';
const isOwner = true;

interface AccountSectionProps {
  changeSection: ({ section, subsection }) => void;
}

const BillingWorkspaceSection = ({ changeSection }: AccountSectionProps) => {
  const { translate } = useTranslationContext();
  const plan = useSelector<RootState, PlanState>((state) => state.plan);
  const [isSubscription, setIsSubscription] = useState<boolean>(false);
  const [cancellingSubscription, setCancellingSubscription] = useState<boolean>(false);
  const [isCancelSubscriptionModalOpen, setIsCancelSubscriptionModalOpen] = useState<boolean>(false);
  const [planName, setPlanName] = useState<string>('');
  const [planInfo, setPlanInfo] = useState<string>('');
  const [currentUsage, setCurrentUsage] = useState<number>(-1);

  const [isEditingBillingDetails, setIsEditingBillingDetails] = useState(false);
  const [isSavingBillingDetails, setIsSavingBillingDetails] = useState(false);
  const [billingDetails, setBillingDetails] = useState<BillingDetails>({
    address,
    addressOptional,
    country,
    city,
    region,
    postalCode,
    phone,
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
      notificationsService.show({ text: translate('notificationMessages.successCancelSubscription') });
      setIsCancelSubscriptionModalOpen(false);
      trackCanceledSubscription({ feedback });
      setTimeout(() => {
        navigationService.openPreferencesDialog({ section: 'general', subsection: 'general' });
        changeSection({ section: 'general', subsection: 'general' });
        window.location.reload();
      }, 2000);
    } catch (err) {
      console.error(err);
      notificationsService.show({
        text: translate('notificationMessages.errorCancelSubscription'),
        type: ToastType.Error,
      });
    }
  }

  const onSaveBillingDetails = (newBillingDetails: BillingDetails) => {
    setIsSavingBillingDetails(true);
    setTimeout(() => {
      setBillingDetails(newBillingDetails);
      setIsSavingBillingDetails(false);
      setIsEditingBillingDetails(false);
    }, 2000);
  };

  return (
    <Section
      title={t('preferences.workspace.billing.title')}
      className="flex max-h-640 flex-1 flex-col space-y-6 overflow-y-auto p-6"
    >
      <BillingWorkspaceOverview plan={plan} />
      <BillingDetailsCard
        address={billingDetails.address}
        phone={billingDetails.phone}
        owner={owner}
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
