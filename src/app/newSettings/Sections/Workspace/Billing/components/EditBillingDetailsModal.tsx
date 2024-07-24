import { t } from 'i18next';
import { useState } from 'react';

import { CustomerBillingInfo } from '@internxt/sdk/dist/drive/payments/types';
import Button from 'app/shared/components/Button/Button';
import Modal from 'app/shared/components/Modal';

import { PhoneInput } from 'react-international-phone';
import 'react-international-phone/style.css';

import DetailsInput from '../../../../components/DetailsInput';
const EditBillingDetailsModal = ({
  isOpen,
  onClose,
  billingDetails,
  onSave,
  isLoading,
}: {
  isOpen: boolean;
  onClose: () => void;
  billingDetails: CustomerBillingInfo;
  onSave: (billinDetails: CustomerBillingInfo) => void;
  isLoading?: boolean;
}) => {
  const MAX_INPUT_LENGHT = 50;
  const { address, phoneNumber } = billingDetails;
  const [editedAddress, setEditedAddress] = useState(address || '');

  const [editedPhone, setEditedPhone] = useState(phoneNumber || '');

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
          {/* TODO: styles need to be adjusted */}
          <div>
            <span className={'text-sm text-gray-80'}>Phone</span>
            <div className="inxt-input h-10 w-full rounded-md border bg-transparent text-lg font-normal text-gray-80 outline-none ring-primary ring-opacity-10 focus:border-primary focus:ring-3 disabled:text-gray-40 disabled:placeholder-gray-20 dark:ring-opacity-20">
              <PhoneInput
                value={editedPhone}
                onChange={setEditedPhone}
                className=" bg-white  dark:bg-black"
                inputClassName="py-1 w-full dark:bg-black px-4 text-lg text-gray-80 dark:text-white outline-none"
                countrySelectorStyleProps={{
                  className: 'focus:border-primary',
                }}
                disabled={isLoading}
                defaultCountry="ES"
                forceDialCode
              />
            </div>
          </div>
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

                phoneNumber: editedPhone,
              })
            }
            disabled={!editedAddress || !editedPhone}
          >
            {t('views.preferences.workspace.overview.editOverviewDetails.saveButton')}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default EditBillingDetailsModal;
