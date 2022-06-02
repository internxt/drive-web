import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { useState } from 'react';
import paymentService from '../../../../../payment/services/payment.service';
import Button from '../../../../../shared/components/Button/Button';
import Card from '../../../../../shared/components/Card';
import Modal from '../../../../../shared/components/Modal';
import Spinner from '../../../../../shared/components/Spinner/Spinner';
import useEffectAsync from '../../../../hooks/useEffectAsync';
import Section from '../../components/Section';

type CardDetails = {
  last4Digits: string;
  expiration: {
    month: string;
    year: string;
  };
  brand: string;
};

export default function PaymentMethod({ className = '' }: { className?: string }): JSX.Element {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const card: CardDetails = {
    last4Digits: '4242',
    expiration: {
      month: '06',
      year: '25',
    },
    brand: 'Visa',
  };
  return (
    <Section className={className} title="Payment method">
      <Card>
        <div className="flex">
          <div className="flex h-9 items-center rounded-md bg-gray-5 px-4">{card.brand}</div>
          <div className="ml-4 flex-1">
            <div className="flex items-center text-gray-80">
              <p style={{ lineHeight: 1 }} className="text-2xl font-bold">
                {'···· ···· ····'}
              </p>
              <p className="ml-1.5 text-sm">{card.last4Digits}</p>
            </div>
            <p className="text-xs text-gray-50">{`${card.expiration.month}/${card.expiration.year}`}</p>
          </div>
          <Button variant="secondary" size="medium" onClick={() => setIsModalOpen(true)}>
            Edit
          </Button>
        </div>
      </Card>

      <PaymentMethodModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </Section>
  );
}

function PaymentMethodModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [setupIntentSecret, setSetupIntentSecret] = useState<null | string>(null);

  useEffectAsync(async () => {
    if (isOpen) {
      setSetupIntentSecret(null);

      const { clientSecret } = await paymentService.createSetupIntent();

      setSetupIntentSecret(clientSecret);
    }
  }, [isOpen]);

  const spinnerSection = (
    <div className="flex h-32 items-center justify-center">
      <Spinner className="h-8 w-8 text-gray-80" />
    </div>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <h1 className="text-2xl font-medium text-gray-80">Add new payment method</h1>
      {setupIntentSecret ? (
        <Elements stripe={paymentService.getStripe()} options={{ clientSecret: setupIntentSecret }}>
          <PaymentForm onClose={onClose} />
        </Elements>
      ) : (
        spinnerSection
      )}
    </Modal>
  );
}
function PaymentForm({ onClose }: { onClose: () => void }) {
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
      <PaymentElement className="mt-5" />
      {error && <p className="mt-2 text-sm text-red-std">{error}</p>}
      <div className="mt-3 flex items-center justify-end">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} className="ml-2">
          Submit
        </Button>
      </div>
    </>
  );
}
