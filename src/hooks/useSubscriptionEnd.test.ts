import { Commitment } from '@internxt/sdk/dist/drive/payments/types/types';
import { renderHook, act } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { useSubscriptionEnd } from './useSubscriptionEnd';

const getDaysUntilExpirationMock = vi.fn();
const reactivateUserSubscriptionMock = vi.fn();
const localStorageGetMock = vi.fn();
const localStorageSetMock = vi.fn();

vi.mock('services', () => ({
  dateService: {
    getDaysUntilExpiration: (date: Date | string) => getDaysUntilExpirationMock(date),
  },
  localStorageService: {
    get: (key: string) => localStorageGetMock(key),
    set: (key: string, value: string) => localStorageSetMock(key, value),
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
    localStorageGetMock.mockReturnValue(null);
    subscriptionCancellationState = {
      isReactivatingSubscription: false,
      reactivateUserSubscription: reactivateUserSubscriptionMock,
    };
  });

  describe('Exposing the cancellation date', () => {
    test('When a commitment with a cancellation date is provided, then the cancellation date is exposed', () => {
      const cancellationDate = '2026-08-20';
      getDaysUntilExpirationMock.mockReturnValue(30);

      const { result } = renderHook(() =>
        useSubscriptionEnd({ commitment: createCommitment(cancellationDate), isCancellationScheduled: true }),
      );

      expect(result.current.cancellationDate).toBe(cancellationDate);
    });

    test('When there is no commitment, then no cancellation date is exposed', () => {
      const { result } = renderHook(() =>
        useSubscriptionEnd({ commitment: undefined, isCancellationScheduled: false }),
      );

      expect(result.current.cancellationDate).toBeUndefined();
    });
  });

  describe('Deciding whether the subscription ending modal should open', () => {
    test('When the subscription ends in exactly 30 days, then the ending modal is open', () => {
      getDaysUntilExpirationMock.mockReturnValue(30);

      const { result } = renderHook(() =>
        useSubscriptionEnd({ commitment: createCommitment('2026-08-20'), isCancellationScheduled: true }),
      );

      expect(result.current.isSubscriptionEndingModalOpen).toBe(true);
    });

    test('When the subscription ends in exactly 7 days, then the ending modal is open', () => {
      getDaysUntilExpirationMock.mockReturnValue(7);

      const { result } = renderHook(() =>
        useSubscriptionEnd({ commitment: createCommitment('2026-07-28'), isCancellationScheduled: true }),
      );

      expect(result.current.isSubscriptionEndingModalOpen).toBe(true);
    });

    test('When the subscription ends in a number of days outside the warning thresholds, then the ending modal is closed', () => {
      getDaysUntilExpirationMock.mockReturnValue(15);

      const { result } = renderHook(() =>
        useSubscriptionEnd({ commitment: createCommitment('2026-08-05'), isCancellationScheduled: true }),
      );

      expect(result.current.isSubscriptionEndingModalOpen).toBe(false);
    });

    test('When cancellation is not scheduled, then the ending modal is closed even within a warning threshold', () => {
      getDaysUntilExpirationMock.mockReturnValue(7);

      const { result } = renderHook(() =>
        useSubscriptionEnd({ commitment: createCommitment('2026-07-28'), isCancellationScheduled: false }),
      );

      expect(result.current.isSubscriptionEndingModalOpen).toBe(false);
    });

    test('When there is no commitment, then the ending modal is closed', () => {
      const { result } = renderHook(() => useSubscriptionEnd({ commitment: undefined, isCancellationScheduled: true }));

      expect(result.current.isSubscriptionEndingModalOpen).toBe(false);
      expect(getDaysUntilExpirationMock).not.toHaveBeenCalled();
    });

    test('When the commitment has no cancellation date, then the ending modal is closed', () => {
      const { result } = renderHook(() =>
        useSubscriptionEnd({ commitment: createCommitment(undefined), isCancellationScheduled: true }),
      );

      expect(result.current.isSubscriptionEndingModalOpen).toBe(false);
      expect(getDaysUntilExpirationMock).not.toHaveBeenCalled();
    });
  });

  describe('Closing the ending modal', () => {
    test('When the modal is closed by the user, then it stays closed for that same warning threshold', () => {
      getDaysUntilExpirationMock.mockReturnValue(7);

      const { result } = renderHook(() =>
        useSubscriptionEnd({ commitment: createCommitment('2026-07-28'), isCancellationScheduled: true }),
      );

      expect(result.current.isSubscriptionEndingModalOpen).toBe(true);

      act(() => {
        result.current.onModalClose();
      });

      expect(result.current.isSubscriptionEndingModalOpen).toBe(false);
      expect(localStorageSetMock).toHaveBeenCalledWith('subscription_ending_modal_closed', '7');
    });

    test('When the modal was closed on a previous warning threshold, then it reopens on a new threshold', () => {
      localStorageGetMock.mockReturnValue('30');
      getDaysUntilExpirationMock.mockReturnValue(7);

      const { result } = renderHook(() =>
        useSubscriptionEnd({ commitment: createCommitment('2026-07-28'), isCancellationScheduled: true }),
      );

      expect(result.current.isSubscriptionEndingModalOpen).toBe(true);
    });

    test('When the modal was already closed for the current threshold on a previous render, then it stays closed', () => {
      localStorageGetMock.mockReturnValue('7');
      getDaysUntilExpirationMock.mockReturnValue(7);

      const { result } = renderHook(() =>
        useSubscriptionEnd({ commitment: createCommitment('2026-07-28'), isCancellationScheduled: true }),
      );

      expect(result.current.isSubscriptionEndingModalOpen).toBe(false);
    });
  });

  describe('Reactivating the subscription', () => {
    test('When reactivation is in progress, then the reactivating flag is exposed as true', () => {
      subscriptionCancellationState = {
        isReactivatingSubscription: true,
        reactivateUserSubscription: reactivateUserSubscriptionMock,
      };

      const { result } = renderHook(() =>
        useSubscriptionEnd({ commitment: createCommitment('2026-08-20'), isCancellationScheduled: true }),
      );

      expect(result.current.isReactivatingSubscription).toBe(true);
    });

    test('When the user reactivates the subscription, then the reactivation action is triggered', () => {
      const { result } = renderHook(() =>
        useSubscriptionEnd({ commitment: createCommitment('2026-08-20'), isCancellationScheduled: true }),
      );

      act(() => {
        result.current.reactivateUserSubscription();
      });

      expect(reactivateUserSubscriptionMock).toHaveBeenCalledTimes(1);
    });
  });
});
