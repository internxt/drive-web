import { useState } from 'react';
import { t } from 'i18next';

import { Elements } from '@stripe/react-stripe-js';

import paymentService from 'app/payment/services/payment.service';
import useEffectAsync from 'app/core/hooks/useEffectAsync';

import Modal from 'app/shared/components/Modal';
import EditPaymentMethodForm from './EditPaymentMethodForm';
import { UserType } from '@internxt/sdk/dist/drive/payments/types';
import { Loader } from '@internxt/ui';

interface EditPaymentMethodModalProps {
  isEditPaymentMethodModalOpen: boolean;
  setIsEditPaymentMethodModalOpen: (isEditPaymentMethodModalOpen) => void;
  userType: UserType;
}

const EditPaymentMethodModal = ({
  isEditPaymentMethodModalOpen,
  setIsEditPaymentMethodModalOpen,
  userType = UserType.Individual,
}: EditPaymentMethodModalProps) => {
  const [setupIntentSecret, setSetupIntentSecret] = useState<null | string>(null);

  useEffectAsync(async () => {
    if (isEditPaymentMethodModalOpen) {
      setSetupIntentSecret(null);

      const { clientSecret } = await paymentService.createSetupIntent(userType);

      setSetupIntentSecret(clientSecret);
    }
  }, [isEditPaymentMethodModalOpen]);

  return (
    <Modal isOpen={isEditPaymentMethodModalOpen} onClose={() => setIsEditPaymentMethodModalOpen(false)}>
      <h1 className="text-2xl font-medium text-gray-80">{t('views.account.tabs.billing.paymentMethod.title')}</h1>
      {setupIntentSecret ? (
        <Elements stripe={paymentService.getStripe()} options={{ clientSecret: setupIntentSecret }}>
          <EditPaymentMethodForm setIsEditPaymentMethodModalOpen={setIsEditPaymentMethodModalOpen} />
        </Elements>
      ) : (
        <Loader classNameLoader="h-8 w-8 text-gray-80" />
      )}
    </Modal>
  );
};

export default EditPaymentMethodModal;
