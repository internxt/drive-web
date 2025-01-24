import { useState } from 'react';
import { t } from 'i18next';

import { PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';

import { Button } from '@internxt/ui';

interface EditPaymentMethodFormProps {
  setIsEditPaymentMethodModalOpen: (isEditPaymentMethodModalOpen: boolean) => void;
}

const EditPaymentMethodForm = ({ setIsEditPaymentMethodModalOpen }: EditPaymentMethodFormProps) => {
  const [error, setError] = useState<null | string>(null);

  const stripe = useStripe();
  const elements = useElements();
  async function handleSubmit() {
    if (!stripe || !elements) return;

    const result = await stripe.confirmSetup({
      elements,
      confirmParams: { return_url: window.location.href },
    });

    if (result.error.message) {
      setError(result.error.message);
    } else {
      setError('Something went wrong while trying to change your payment method');
    }
  }
  return (
    <>
      <div className="flex max-h-[60vh] flex-col overflow-y-auto">
        <PaymentElement className="mt-5" />
      </div>
      {error && <p className="mt-2 text-sm text-red">{error}</p>}
      <div className="mt-3 flex items-center justify-end">
        <Button variant="secondary" onClick={() => setIsEditPaymentMethodModalOpen(false)}>
          {t('actions.cancel')}
        </Button>
        <Button onClick={handleSubmit} className="ml-2">
          {t('actions.save')}
        </Button>
      </div>
    </>
  );
};

export default EditPaymentMethodForm;
