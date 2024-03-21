import { useState } from 'react';
import { t } from 'i18next';

import { BillingDetails } from '../types';
import Modal from 'app/shared/components/Modal';
import DetailsInput from './DetailsInput';
import Button from 'app/shared/components/Button/Button';

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

export default EditBillingDetailsModal;
