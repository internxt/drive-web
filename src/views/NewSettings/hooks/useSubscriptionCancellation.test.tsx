import { renderHook, act } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { UserType } from '@internxt/sdk/dist/drive/payments/types/types';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';
import longNotificationsService from 'app/notifications/services/longNotification.service';
import { paymentService } from 'views/Checkout/services';
import { errorService } from 'services';
import { useSubscriptionCancellation } from './useSubscriptionCancellation';

const { mockDispatch, mockInitializeThunk } = vi.hoisted(() => ({
  mockDispatch: vi.fn(() => ({ unwrap: vi.fn() })),
  mockInitializeThunk: vi.fn(() => ({ type: 'initializeThunk' })),
}));

vi.mock('i18next', () => ({ default: { t: (key: string) => key }, t: (key: string) => key }));
vi.mock('app/store/hooks', () => ({ useAppDispatch: () => mockDispatch }));
vi.mock('app/store/slices/plan', () => ({
  planThunks: { initializeThunk: mockInitializeThunk },
  planSelectors: {
    subscriptionToShow: vi.fn(),
    planUsageToShow: vi.fn(),
    planLimitToShow: vi.fn(),
  },
  planActions: {},
  default: (state = {}) => state,
}));

const activeSubscription = { type: 'subscription' as const, subscriptionId: 'sub-id' } as any;

describe('Subscription Cancellation - Custom Hook', () => {
  let cancelSubscriptionSpy: ReturnType<typeof vi.spyOn>;
  let applyCancellationTrialSpy: ReturnType<typeof vi.spyOn>;
  let notificationShowSpy: ReturnType<typeof vi.spyOn>;
  let longNotificationShowSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    cancelSubscriptionSpy = vi.spyOn(paymentService, 'cancelSubscription');
    applyCancellationTrialSpy = vi.spyOn(paymentService, 'applyCancellationTrial');
    notificationShowSpy = vi.spyOn(notificationsService, 'show').mockImplementation(() => '');
    longNotificationShowSpy = vi.spyOn(longNotificationsService, 'show').mockImplementation(() => '');
    vi.spyOn(errorService, 'reportError').mockImplementation(() => undefined);
    vi.spyOn(errorService, 'castError').mockReturnValue({ requestId: 'request-id' } as any);
  });

  describe('Cancelling subscription', () => {
    test('When the subscription is cancelled, then it succeeds and closes the modal', async () => {
      cancelSubscriptionSpy.mockResolvedValueOnce(undefined);
      const onModalClose = vi.fn();
      const onCancelSuccess = vi.fn();
      const { result } = renderHook(() => useSubscriptionCancellation({ onModalClose, onCancelSuccess }));

      await act(async () => {
        await result.current.cancelSubscription(UserType.Individual);
      });

      expect(cancelSubscriptionSpy).toHaveBeenCalledWith(UserType.Individual);
      expect(notificationShowSpy).toHaveBeenCalled();
      expect(onModalClose).toHaveBeenCalled();
      expect(onCancelSuccess).toHaveBeenCalled();
      expect(result.current.isCancellingSubscription).toBe(false);
    });

    test('When the cancellation fails, then an error notification is shown and the modal stays open', async () => {
      cancelSubscriptionSpy.mockRejectedValueOnce(new Error('failed'));
      const onModalClose = vi.fn();
      const { result } = renderHook(() => useSubscriptionCancellation({ onModalClose }));

      await act(async () => {
        await result.current.cancelSubscription();
      });

      expect(notificationShowSpy).toHaveBeenCalledWith(
        expect.objectContaining({ text: 'notificationMessages.errorCancelSubscription', type: ToastType.Error }),
      );
      expect(onModalClose).not.toHaveBeenCalled();
      expect(result.current.isCancellingSubscription).toBe(false);
    });

    test('When the subscription is cancelled, then the plan is refreshed after the delay', async () => {
      cancelSubscriptionSpy.mockResolvedValueOnce(undefined);
      const { result } = renderHook(() => useSubscriptionCancellation({}));

      await act(async () => {
        await result.current.cancelSubscription();
      });

      expect(mockInitializeThunk).not.toHaveBeenCalled();
      await act(async () => {
        vi.runAllTimers();
      });
      expect(mockInitializeThunk).toHaveBeenCalled();
    });
  });

  describe('Activating trial', () => {
    test('When the trial is activated for an active subscription, then it succeeds and closes the modal', async () => {
      applyCancellationTrialSpy.mockResolvedValueOnce(undefined);
      const onModalClose = vi.fn();
      const { result } = renderHook(() => useSubscriptionCancellation({ onModalClose }));

      await act(async () => {
        await result.current.activateTrial();
      });

      expect(applyCancellationTrialSpy).toHaveBeenCalled();
      expect(longNotificationShowSpy).toHaveBeenCalledWith({
        text: 'notificationMessages.successApplyCancellationIncentive',
      });
      expect(onModalClose).toHaveBeenCalled();
      expect(result.current.isApplyingTrial).toBe(false);
    });

    test('When the trial activation fails, then an error notification is shown', async () => {
      applyCancellationTrialSpy.mockRejectedValueOnce(new Error('failed'));
      const { result } = renderHook(() => useSubscriptionCancellation({}));

      await act(async () => {
        await result.current.activateTrial();
      });

      expect(notificationShowSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          text: 'notificationMessages.errorApplyCancellationIncentive',
          type: ToastType.Error,
        }),
      );
      expect(result.current.isApplyingTrial).toBe(false);
    });
  });
});
