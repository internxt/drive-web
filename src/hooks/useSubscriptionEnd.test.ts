import { Commitment } from '@internxt/sdk/dist/drive/payments/types/types';
import { renderHook, act } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { useSubscriptionEnd } from './useSubscriptionEnd';

const getDaysUntilExpirationMock = vi.fn();
const reactivateUserSubscriptionMock = vi.fn();

vi.mock('services', () => ({
  dateService: {
    getDaysUntilExpiration: (date: Date | string) => getDaysUntilExpirationMock(date),
  },
}));

let subscriptionCancellationState = {
  isReactivatingSubscription: false,
  reactivateUserSubscription: reactivateUserSubscriptionMock,
};

vi.mock('views/NewSettings/hooks', () => ({
  useSubscriptionCancellation: () => subscriptionCancellationState,
}));

const createCommitment = (cancellationDate?: string): Commitment => ({ cancellationDate }) as unknown as Commitment;

describe('Subscription ending management - Custom hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    subscriptionCancellationState = {
      isReactivatingSubscription: false,
      reactivateUserSubscription: reactivateUserSubscriptionMock,
    };
  });

  describe('Exposing the cancellation date', () => {
    test('When a commitment with a cancellation date is provided, then the cancellation date is exposed', () => {
      const cancellationDate = '2026-08-20';
      getDaysUntilExpirationMock.mockReturnValue(30);

      const { result } = renderHook(() => useSubscriptionEnd({ commitment: createCommitment(cancellationDate) }));

      expect(result.current.cancellationDate).toBe(cancellationDate);
    });

    test('When there is no commitment, then no cancellation date is exposed', () => {
      const { result } = renderHook(() => useSubscriptionEnd({ commitment: undefined }));

      expect(result.current.cancellationDate).toBeUndefined();
    });
  });

  describe('Deciding whether the subscription ending modal should open', () => {
    test('When the subscription ends in exactly 30 days, then the ending modal is open', () => {
      getDaysUntilExpirationMock.mockReturnValue(30);

      const { result } = renderHook(() => useSubscriptionEnd({ commitment: createCommitment('2026-08-20') }));

      expect(result.current.isSubscriptionEndingModalOpen).toBe(true);
    });

    test('When the subscription ends in exactly 7 days, then the ending modal is open', () => {
      getDaysUntilExpirationMock.mockReturnValue(7);

      const { result } = renderHook(() => useSubscriptionEnd({ commitment: createCommitment('2026-07-28') }));

      expect(result.current.isSubscriptionEndingModalOpen).toBe(true);
    });

    test('When the subscription ends in a number of days outside the warning thresholds, then the ending modal is closed', () => {
      getDaysUntilExpirationMock.mockReturnValue(15);

      const { result } = renderHook(() => useSubscriptionEnd({ commitment: createCommitment('2026-08-05') }));

      expect(result.current.isSubscriptionEndingModalOpen).toBe(false);
    });

    test('When there is no commitment, then the ending modal is closed', () => {
      const { result } = renderHook(() => useSubscriptionEnd({ commitment: undefined }));

      expect(result.current.isSubscriptionEndingModalOpen).toBe(false);
      expect(getDaysUntilExpirationMock).not.toHaveBeenCalled();
    });

    test('When the commitment has no cancellation date, then the ending modal is closed', () => {
      const { result } = renderHook(() => useSubscriptionEnd({ commitment: createCommitment(undefined) }));

      expect(result.current.isSubscriptionEndingModalOpen).toBe(false);
      expect(getDaysUntilExpirationMock).not.toHaveBeenCalled();
    });
  });

  describe('Closing the ending modal', () => {
    test('When the modal is closed by the user, then it stays closed even if the subscription is within a warning threshold', () => {
      getDaysUntilExpirationMock.mockReturnValue(7);

      const { result } = renderHook(() => useSubscriptionEnd({ commitment: createCommitment('2026-07-28') }));

      expect(result.current.isSubscriptionEndingModalOpen).toBe(true);

      act(() => {
        result.current.onModalClose();
      });

      expect(result.current.isSubscriptionEndingModalOpen).toBe(false);
    });
  });

  describe('Reactivating the subscription', () => {
    test('When reactivation is in progress, then the reactivating flag is exposed as true', () => {
      subscriptionCancellationState = {
        isReactivatingSubscription: true,
        reactivateUserSubscription: reactivateUserSubscriptionMock,
      };

      const { result } = renderHook(() => useSubscriptionEnd({ commitment: createCommitment('2026-08-20') }));

      expect(result.current.isReactivatingSubscription).toBe(true);
    });

    test('When the user reactivates the subscription, then the reactivation action is triggered', () => {
      const { result } = renderHook(() => useSubscriptionEnd({ commitment: createCommitment('2026-08-20') }));

      act(() => {
        result.current.reactivateUserSubscription();
      });

      expect(reactivateUserSubscriptionMock).toHaveBeenCalledTimes(1);
    });
  });
});
