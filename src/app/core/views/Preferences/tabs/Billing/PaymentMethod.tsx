import { PaymentMethod } from '@internxt/sdk/dist/drive/payments/types';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { useEffect, useState } from 'react';
import paymentService from '../../../../../payment/services/payment.service';
import Button from '../../../../../shared/components/Button/Button';
import Card from '../../../../../shared/components/Card';
import Modal from '../../../../../shared/components/Modal';
import Spinner from '../../../../../shared/components/Spinner/Spinner';
import useEffectAsync from '../../../../hooks/useEffectAsync';
import Section from '../../components/Section';

import visaIcon from '../../../../../../assets/icons/card-brands/visa.png';
import amexIcon from '../../../../../../assets/icons/card-brands/amex.png';
import dinersIcon from '../../../../../../assets/icons/card-brands/diners_club.png';
import discoverIcon from '../../../../../../assets/icons/card-brands/discover.png';
import jcbIcon from '../../../../../../assets/icons/card-brands/jcb.png';
import mastercardIcon from '../../../../../../assets/icons/card-brands/mastercard.png';
import unionpayIcon from '../../../../../../assets/icons/card-brands/unionpay.png';
import unknownIcon from '../../../../../../assets/icons/card-brands/unknown.png';

export default function PaymentMethodComponent({ className = '' }: { className?: string }): JSX.Element {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [card, setCard] = useState<PaymentMethod['card'] | null>(null);

  const cardBrands: Record<PaymentMethod['card']['brand'], string> = {
    visa: visaIcon,
    amex: amexIcon,
    diners: dinersIcon,
    discover: discoverIcon,
    jcb: jcbIcon,
    mastercard: mastercardIcon,
    unionpay: unionpayIcon,
    unknown: unknownIcon,
  };

  useEffect(() => {
    paymentService
      .getDefaultPaymentMethod()
      .then((data) => setCard(data.card))
      .catch(console.error);
  }, []);

  return (
    <Section className={className} title="Payment method">
      <Card>
        {card ? (
          <div className="flex">
            <img className="h-9 rounded-md" src={cardBrands[card.brand]} />
            <div className="ml-4 flex-1">
              <div className="flex items-center text-gray-80">
                <p style={{ lineHeight: 1 }} className="text-2xl font-bold">
                  {'···· ···· ····'}
                </p>
                <p className="ml-1.5 text-sm">{card.last4}</p>
              </div>
              <p className="text-xs text-gray-50">{`${card.exp_month}/${card.exp_year}`}</p>
            </div>
            <Button variant="secondary" size="medium" onClick={() => setIsModalOpen(true)}>
              Edit
            </Button>
          </div>
        ) : (
          <div className="flex h-10 items-center justify-center">
            <Spinner className="h-5 w-5" />
          </div>
        )}
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
