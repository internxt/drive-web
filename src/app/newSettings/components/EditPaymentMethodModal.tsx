import { useState } from 'react';
import { t } from 'i18next';

import { Elements } from '@stripe/react-stripe-js';

import paymentService from 'app/payment/services/payment.service';
import useEffectAsync from 'app/core/hooks/useEffectAsync';

import Modal from 'app/shared/components/Modal';
import Spinner from 'app/shared/components/Spinner/Spinner';
import EditPaymentMethodForm from './EditPaymentMethodForm';

interface EditPaymentMethodModalProps {
  isEditPaymentMethodModalOpen: boolean;
  setIsEditPaymentMethodModalOpen: (isEditPaymentMethodModalOpen) => void;
}

const EditPaymentMethodModal = ({
  isEditPaymentMethodModalOpen,
  setIsEditPaymentMethodModalOpen,
}: EditPaymentMethodModalProps) => {
  const [setupIntentSecret, setSetupIntentSecret] = useState<null | string>(null);

  useEffectAsync(async () => {
    if (isEditPaymentMethodModalOpen) {
      setSetupIntentSecret(null);

      const { clientSecret } = await paymentService.createSetupIntent();

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
        <Spinner className="h-8 w-8 text-gray-80" />
      )}
    </Modal>
  );
};

export default EditPaymentMethodModal;
