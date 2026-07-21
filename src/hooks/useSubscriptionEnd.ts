import { Commitment } from '@internxt/sdk/dist/drive/payments/types/types';
import { useState } from 'react';
import { dateService } from 'services';
import { useSubscriptionCancellation } from 'views/NewSettings/hooks';

interface UseSubscriptionEndProps {
  commitment?: Commitment;
}

interface UseSubscriptionEndResponse {
  isReactivatingSubscription: boolean;
  isSubscriptionEndingModalOpen: boolean;
  cancellationDate?: string;
  reactivateUserSubscription: () => void;
  onModalClose: () => void;
}

const SUBSCRIPTION_ENDING_WARNING_DAYS = [30, 7];

export const useSubscriptionEnd = ({ commitment }: UseSubscriptionEndProps): UseSubscriptionEndResponse => {
  const [isSubscriptionEndingModalClosed, setIsSubscriptionEndingModalClosed] = useState<boolean>(false);

  const onModalClose = () => setIsSubscriptionEndingModalClosed(true);

  const { isReactivatingSubscription, reactivateUserSubscription } = useSubscriptionCancellation({
    onModalClose,
  });

  const cancellationDate = commitment?.cancellationDate;
  const daysUntilCancellation = cancellationDate ? dateService.getDaysUntilExpiration(cancellationDate) : null;
  const isSubscriptionEndingModalOpen =
    !isSubscriptionEndingModalClosed &&
    daysUntilCancellation !== null &&
    SUBSCRIPTION_ENDING_WARNING_DAYS.includes(daysUntilCancellation);

  return {
    cancellationDate,
    isReactivatingSubscription,
    isSubscriptionEndingModalOpen,
    reactivateUserSubscription,
    onModalClose,
  };
};
