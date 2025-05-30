import errorService from 'app/core/services/error.service';
import navigationService from 'app/core/services/navigation.service';
import { AppView } from 'app/core/types';
import paymentService from 'app/payment/services/payment.service';
import { useEffect } from 'react';
import { useParams } from 'react-router-dom';

export const CheckoutSessionId = () => {
  const { sessionId } = useParams<{ sessionId: string }>();

  const checkSessionId = (id: string): boolean => {
    const pattern = /^cs_(test|live)_[a-zA-Z0-9]+$/;
    return pattern.test(id);
  };

  useEffect(() => {
    if (sessionId) {
      const isValid = checkSessionId(sessionId);

      if (isValid) {
        paymentService.redirectToCheckout({ sessionId }).catch((err) => {
          errorService.reportError(err);
          navigationService.push(AppView.CheckoutCancel);
        });
        return;
      }
    }
  }, [sessionId]);

  return <></>;
};
