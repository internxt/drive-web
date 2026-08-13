import { Commitment } from '@internxt/sdk/dist/drive/payments/types/types';
import { LocalStorageItem } from 'app/core/types';
import { useState } from 'react';
import { dateService, localStorageService } from 'services';
import { useSubscriptionCancellation } from 'views/NewSettings/hooks';

interface UseSubscriptionEndProps {
  commitment?: Commitment;
  isCancellationScheduled: boolean;
}

interface UseSubscriptionEndResponse {
  isReactivatingSubscription: boolean;
  isSubscriptionEndingModalOpen: boolean;
  cancellationDate?: string;
  reactivateUserSubscription: () => void;
  onModalClose: () => void;
}

const SUBSCRIPTION_ENDING_WARNING_DAYS = [30, 7];

export const useSubscriptionEnd = ({
  commitment,
  isCancellationScheduled,
}: UseSubscriptionEndProps): UseSubscriptionEndResponse => {
  const [lastClosedWarningDays, setLastClosedWarningDays] = useState<number | null>(() => {
    const stored = localStorageService.get(LocalStorageItem.SubscriptionEndingModalClosed);
    return stored ? Number(stored) : null;
  });

  const cancellationDate = commitment?.cancellationDate;
  const daysUntilCancellation = cancellationDate ? dateService.getDaysUntilExpiration(cancellationDate) : null;

  const onModalClose = () => {
    if (daysUntilCancellation === null) return;
    setLastClosedWarningDays(daysUntilCancellation);
    localStorageService.set(LocalStorageItem.SubscriptionEndingModalClosed, String(daysUntilCancellation));
  };

  const { isReactivatingSubscription, reactivateUserSubscription } = useSubscriptionCancellation({
    onModalClose,
  });

  const isWithinWarningWindow =
    daysUntilCancellation !== null && SUBSCRIPTION_ENDING_WARNING_DAYS.includes(daysUntilCancellation);
  const hasDismissedCurrentWarning = lastClosedWarningDays === daysUntilCancellation;
  const isSubscriptionEndingModalOpen = isCancellationScheduled && isWithinWarningWindow && !hasDismissedCurrentWarning;

  return {
    cancellationDate,
    isReactivatingSubscription,
    isSubscriptionEndingModalOpen,
    reactivateUserSubscription,
    onModalClose,
  };
};
