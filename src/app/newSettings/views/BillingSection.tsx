import { useState } from 'react';
import { useSelector } from 'react-redux';
import { t } from 'i18next';

import { RootState } from 'app/store';
import { PlanState } from 'app/store/slices/plan';

import Section from '../../core/views/Preferences/components/Section';
import Invoices from '../containers/InvoicesContainer';
import { BillingDetails } from '../types';
import EditBillingDetailsModal from '../components/EditBillingDetailsModal';
import BillingDetailsCard from '../components/BillingDetailsCard';
import BillingOverview from '../components/BillingOverview';
import BillingPaymentMethodCard from '../components/BillingPaymentMethodCard';

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

const BillingSection = () => {
  const plan = useSelector<RootState, PlanState>((state) => state.plan);

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
      <BillingOverview plan={plan} />
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
      <BillingPaymentMethodCard />
      <Invoices />
    </Section>
  );
};

export default BillingSection;
