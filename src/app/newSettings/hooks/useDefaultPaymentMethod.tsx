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

export const useDefaultPaymentMethod = (userFullName: string, userType?: UserType) => {
  const [defaultPaymentMethod, setDefaultPaymentMethod] = useState<DefaultPaymentMethodProps>({
    tag: 'loading',
  });

  useEffect(() => {
    paymentService
      .getDefaultPaymentMethod(userType || UserType.Individual)
      .then((data: PaymentMethod | Source) => {
        const billingDetailsName = (data as PaymentMethod).billing_details?.name;
        const cardName = billingDetailsName || userFullName;
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
