import { t } from 'i18next';
import { useState } from 'react';
import Section from '../../core/views/Preferences/components/Section';
import Button from '../../shared/components/Button/Button';
import Card from '../../shared/components/Card';
import Modal from '../../shared/components/Modal';
import Detail from '../components/Detail';
import DetailsInput from '../components/DetailsInput';

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
    <Section title="Overview" className="flex max-h-640 flex-1 flex-col space-y-6 overflow-y-auto p-6">
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

type BillingDetails = {
  address: string;
  addressOptional?: string;
  country: string;
  city: string;
  region: string;
  postalCode: string;
  phone: string;
};

const EditBillingDetailsModal = ({
  isOpen,
  onClose,
  billingDetails,
  onSave,
  isLoading,
}: {
  isOpen: boolean;
  onClose: () => void;
  billingDetails: BillingDetails;
  onSave: (billinDetails: BillingDetails) => void;
  isLoading?: boolean;
}) => {
  const MAX_INPUT_LENGHT = 50;
  const { address, addressOptional, country, city, region, postalCode, phone } = billingDetails;
  const [editedAddress, setEditedAddress] = useState(address);
  const [editedAddressOptional, setEditedAddressOptional] = useState(addressOptional ?? '');
  const [editedCountry, setEditedCountry] = useState(country);
  const [editedCity, setEditedCity] = useState(city);
  const [editedRegion, setEditedRegion] = useState(region);
  const [editedPostal, setEditedPostal] = useState(postalCode);
  const [editedPhone, setEditedPhone] = useState(phone);

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="flex flex-col space-y-5">
        <h1 className=" text-2xl font-medium leading-7">Billing Details</h1>
        <div className="flex grow flex-col space-y-4">
          <DetailsInput
            label="Address"
            textValue={editedAddress}
            onChangeTextValue={setEditedAddress}
            maxLength={MAX_INPUT_LENGHT}
            disabled={isLoading}
            hideMaxLength
          />
          <div className="flex flex-row space-x-5">
            <DetailsInput
              label="Appt, unit, suite, etc"
              textValue={editedAddressOptional}
              onChangeTextValue={setEditedAddressOptional}
              maxLength={MAX_INPUT_LENGHT}
              disabled={isLoading}
              hideMaxLength
            />
            <DetailsInput
              label="Country"
              textValue={editedCountry}
              onChangeTextValue={setEditedCountry}
              maxLength={MAX_INPUT_LENGHT}
              disabled={isLoading}
              hideMaxLength
            />
          </div>
          <div className="flex flex-row space-x-5">
            <DetailsInput
              label="City / Town / Village"
              textValue={editedCity}
              onChangeTextValue={setEditedCity}
              maxLength={MAX_INPUT_LENGHT}
              disabled={isLoading}
              hideMaxLength
            />
            <DetailsInput
              label="Province / Region"
              textValue={editedRegion}
              onChangeTextValue={setEditedRegion}
              maxLength={MAX_INPUT_LENGHT}
              disabled={isLoading}
              hideMaxLength
            />
            <DetailsInput
              label="Postal code"
              textValue={editedPostal}
              onChangeTextValue={setEditedPostal}
              maxLength={MAX_INPUT_LENGHT}
              disabled={isLoading}
              hideMaxLength
            />
          </div>
          <DetailsInput
            label="Phone"
            textValue={editedPhone}
            onChangeTextValue={setEditedPhone}
            maxLength={MAX_INPUT_LENGHT}
            disabled={isLoading}
            hideMaxLength
          />
        </div>

        <div className="flex w-full flex-row justify-end space-x-2">
          <Button disabled={isLoading} variant="secondary" onClick={onClose}>
            {t('views.preferences.workspace.overview.editOverviewDetails.cancelButton')}
          </Button>
          <Button
            loading={isLoading}
            variant="primary"
            onClick={() =>
              onSave({
                address: editedAddress,
                addressOptional: editedAddressOptional,
                country: editedCountry,
                city: editedCity,
                region: editedRegion,
                postalCode: editedPostal,
                phone: editedPhone,
              })
            }
          >
            {t('views.preferences.workspace.overview.editOverviewDetails.saveButton')}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default BillingSection;
