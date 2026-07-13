import { useEffect, useRef } from 'react';
import { useStripe } from '@stripe/react-stripe-js';
import { errorService } from 'services';

interface ConfirmEarlyCancellationPaymentProps {
  clientSecret: string;
  onConfirmed: () => void;
  onError: (message?: string) => void;
}

const ConfirmEarlyCancellationPayment = ({
  clientSecret,
  onConfirmed,
  onError,
}: ConfirmEarlyCancellationPaymentProps): null => {
  const stripe = useStripe();
  const hasConfirmedRef = useRef(false);

  useEffect(() => {
    if (!stripe || hasConfirmedRef.current) return;
    hasConfirmedRef.current = true;

    stripe
      .confirmPayment({
        clientSecret,
        confirmParams: { return_url: window.location.href },
        redirect: 'if_required',
      })
      .then(({ error }) => {
        if (error) {
          errorService.reportError(error);
          onError(error.message);
          return;
        }
        onConfirmed();
      });
  }, [stripe, clientSecret, onConfirmed, onError]);

  return null;
};

export default ConfirmEarlyCancellationPayment;
