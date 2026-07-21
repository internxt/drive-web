import { describe, test, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { PriceWithTax } from '@internxt/sdk/dist/payments/types';
import { UserType } from '@internxt/sdk/dist/drive/payments/types/types';

import { AppView } from 'app/core/types';
import longNotificationsService from 'app/notifications/services/longNotification.service';
import notificationsService from 'app/notifications/services/notifications.service';
import errorService from 'services/error.service';
import navigationService from 'services/navigation.service';
import { paymentService } from '../services';
import { useSubscriptionUpdate } from './useSubscriptionUpdate';

const mockDispatch = vi.fn(() => ({ unwrap: () => Promise.resolve() }));

vi.mock('app/i18n/provider/TranslationProvider', () => ({
  useTranslationContext: vi.fn().mockReturnValue({
    translate: vi.fn().mockImplementation((key: string) => key),
  }),
}));

vi.mock('app/store/hooks', () => ({
  useAppDispatch: () => mockDispatch,
}));

vi.mock('app/store/slices/plan', async (importActual) => ({
  ...(await importActual<typeof import('app/store/slices/plan')>()),
  planThunks: { initializeThunk: vi.fn() },
}));

const mockSelectedPlan: PriceWithTax = {
  price: {
    id: 'price_123',
    bytes: 1099511627776,
    decimalAmount: 10,
    product: 'prod_1234',
    currency: 'eur',
    amount: 10,
    interval: 'year',
    type: UserType.Individual,
  },
  taxes: {
    amountWithTax: 1210,
    decimalTax: 12.1,
    tax: 210,
    decimalAmountWithTax: 12.1,
  },
};

const buildProps = (overrides = {}) => ({
  selectedPlan: mockSelectedPlan,
  promotionCode: 'SUMMER',
  setIsUpdatingSubscription: vi.fn(),
  setIsUpdateSubscriptionDialogOpen: vi.fn(),
  ...overrides,
});

describe('Subscription update custom hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(navigationService, 'push').mockImplementation(() => {});
  });

  test('When the user confirms a plan change, then the subscription is updated with the selected plan and coupon', async () => {
    const updateSpy = vi
      .spyOn(paymentService, 'updateSubscriptionWithConfirmation')
      .mockResolvedValue(undefined as never);
    const { result } = renderHook(() => useSubscriptionUpdate(buildProps()));

    await act(async () => {
      await result.current.onChangePlanClicked();
    });

    expect(updateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        priceId: 'price_123',
        userType: UserType.Individual,
        coupon: 'SUMMER',
      }),
    );
  });

  test('When the plan change succeeds, then the plan is refreshed, a success notification is shown and the user is redirected to Drive', async () => {
    vi.spyOn(paymentService, 'updateSubscriptionWithConfirmation').mockImplementation(async ({ onSuccess }) => {
      onSuccess?.();
    });
    const notificationSpy = vi.spyOn(notificationsService, 'show').mockReturnValue('');
    const setIsUpdatingSubscription = vi.fn();
    const setIsUpdateSubscriptionDialogOpen = vi.fn();

    const { result } = renderHook(() =>
      useSubscriptionUpdate(buildProps({ setIsUpdatingSubscription, setIsUpdateSubscriptionDialogOpen })),
    );

    await act(async () => {
      await result.current.onChangePlanClicked();
    });

    expect(notificationSpy).toHaveBeenCalledWith(
      expect.objectContaining({ text: 'Subscription updated successfully' }),
    );
    expect(mockDispatch).toHaveBeenCalled();
    expect(setIsUpdatingSubscription).toHaveBeenNthCalledWith(1, true);
    expect(setIsUpdatingSubscription).toHaveBeenLastCalledWith(false);
    expect(setIsUpdateSubscriptionDialogOpen).toHaveBeenCalledWith(false);
    expect(navigationService.push).toHaveBeenCalledWith(AppView.Drive);
  });

  test('When there is no selected plan, then no subscription update is attempted', async () => {
    const updateSpy = vi
      .spyOn(paymentService, 'updateSubscriptionWithConfirmation')
      .mockResolvedValue(undefined as never);
    const { result } = renderHook(() => useSubscriptionUpdate(buildProps({ selectedPlan: undefined })));

    await act(async () => {
      await result.current.onChangePlanClicked();
    });

    expect(updateSpy).not.toHaveBeenCalled();
  });

  test('When the subscription update fails, then the error is surfaced to the user', async () => {
    const error = new Error('Payment failed');
    vi.spyOn(paymentService, 'updateSubscriptionWithConfirmation').mockRejectedValue(error);
    vi.spyOn(errorService, 'castError').mockReturnValue(error as never);
    const longNotificationSpy = vi.spyOn(longNotificationsService, 'show').mockReturnValue('');

    const { result } = renderHook(() => useSubscriptionUpdate(buildProps()));

    await act(async () => {
      await result.current.onChangePlanClicked();
    });

    expect(longNotificationSpy).toHaveBeenCalledWith(expect.objectContaining({ text: 'Payment failed' }));
  });
});
