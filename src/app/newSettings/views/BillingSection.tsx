import { t } from 'i18next';
import { useState } from 'react';
import Section from '../../core/views/Preferences/components/Section';
import Button from '../../shared/components/Button/Button';
import Card from '../../shared/components/Card';
import Detail from '../components/Detail';
import Invoices from '../containers/InvoicesContainer';
import { BillingDetails } from '../types';
import EditBillingDetailsModal from '../components/EditBillingDetailsModal';

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
      <OverviewDetailsCard
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
      <Invoices />
    </Section>
  );
};

interface OverviewDetailsCardProps {
  address: string;
  phone: string;
  owner: string;
  isOwner: boolean;
  onEditButtonClick: () => void;
}

const OverviewDetailsCard = ({ address, phone, owner, isOwner, onEditButtonClick }: OverviewDetailsCardProps) => {
  if (!isOwner) return null;

  return (
    <div className="space-y-3">
      <div className="flex w-full flex-row items-center justify-between ">
        <span className="text-xl font-medium">{t('views.preferences.workspace.billing.billingDetails')}</span>
        <Button variant="secondary" onClick={onEditButtonClick}>
          <span>{t('views.preferences.workspace.billing.editBilling')}</span>
        </Button>
      </div>
      <Card>
        <div className="flex flex-row  space-x-10">
          <div className="flex h-full w-full min-w-0 grow flex-col ">
            <Detail label={t('views.preferences.workspace.overview.address')} value={address} />
          </div>

          <div className="flex w-full min-w-0 grow flex-col space-y-2 ">
            <Detail label={t('views.preferences.workspace.overview.phone')} value={phone} />
            <Detail label={t('views.preferences.workspace.overview.owner')} value={owner} />
          </div>
        </div>
      </Card>
    </div>
  );
};

export default BillingSection;
