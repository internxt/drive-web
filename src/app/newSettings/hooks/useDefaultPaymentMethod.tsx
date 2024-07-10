import { useEffect, useState } from 'react';

import { PaymentMethod, UserType } from '@internxt/sdk/dist/drive/payments/types';
import { Source } from '@stripe/stripe-js';

import paymentService from 'app/payment/services/payment.service';

interface DefaultPaymentMethodProps {
  tag: 'ready' | 'loading' | 'empty';
  card?: PaymentMethod['card'];
  type?: Source.Type;
  name?: string;
}

// MOCKED DATA
const cardName = 'Fran Villalba Segarra';

export const useDefaultPaymentMethod = (userType?: UserType) => {
  const [defaultPaymentMethod, setDefaultPaymentMethod] = useState<DefaultPaymentMethodProps>({
    tag: 'loading',
  });

  useEffect(() => {
    paymentService
      .getDefaultPaymentMethod(userType || UserType.Individual)
      .then((data: PaymentMethod | Source) => {
        if (data.card) {
          setDefaultPaymentMethod({ tag: 'ready', card: data.card as PaymentMethod['card'], name: cardName });
        } else if ('type' in data) {
          setDefaultPaymentMethod({ tag: 'ready', type: data.type, name: cardName });
        } else {
          setDefaultPaymentMethod({ tag: 'empty' });
        }
      })
      .catch(() => setDefaultPaymentMethod({ tag: 'empty' }));
  }, []);
  return defaultPaymentMethod;
};
