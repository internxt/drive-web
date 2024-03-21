import { useEffect, useState } from 'react';

import { PaymentMethod } from '@internxt/sdk/dist/drive/payments/types';
import { Source } from '@stripe/stripe-js';

import paymentService from 'app/payment/services/payment.service';

interface DefaultPaymentMethodProps {
  tag: 'ready' | 'loading' | 'empty';
  card?: PaymentMethod['card'];
  type?: Source.Type;
}

export const useDefaultPaymentMethod = () => {
  const [defaultPaymentMethod, setDefaultPaymentMethod] = useState<DefaultPaymentMethodProps>({
    tag: 'loading',
  });

  useEffect(() => {
    paymentService
      .getDefaultPaymentMethod()
      .then((data: PaymentMethod | Source) => {
        if (data.card) {
          setDefaultPaymentMethod({ tag: 'ready', card: data.card as PaymentMethod['card'] });
        } else if ('type' in data) {
          setDefaultPaymentMethod({ tag: 'ready', type: data.type });
        } else {
          setDefaultPaymentMethod({ tag: 'empty' });
        }
      })
      .catch(() => setDefaultPaymentMethod({ tag: 'empty' }));
  }, []);
  return defaultPaymentMethod;
};
