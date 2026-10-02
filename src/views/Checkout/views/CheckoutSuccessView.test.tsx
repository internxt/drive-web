import { beforeEach, describe, expect, test, vi } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import CheckoutSuccessView from './CheckoutSuccessView';
import { AppView } from 'app/core/types';
import { PURCHASE_LOCAL_STORAGE_ITEMS } from 'services/storage-keys';

const mocks = vi.hoisted(() => ({
  localStorageRemoveItem: vi.fn(),
  navigationPush: vi.fn(),
  retrievePaymentIntent: vi.fn(),
  retrieveSetupIntent: vi.fn(),
  metaTrackPurchase: vi.fn(),
  gaTrackPurchase: vi.fn().mockResolvedValue(undefined),
  trackPaymentConversion: vi.fn().mockResolvedValue(undefined),
  userStoragePolling: vi.fn(),
  notificationsShow: vi.fn(),
  isProduction: vi.fn(() => true),
}));

vi.mock('app/store/hooks', () => ({ useAppDispatch: () => vi.fn() }));
vi.mock('services/navigation.service', () => ({ default: { push: mocks.navigationPush } }));
vi.mock('services/local-storage.service', () => ({ default: { removeItem: mocks.localStorageRemoveItem } }));
vi.mock('app/analytics/meta.service', () => ({ default: { trackPurchase: mocks.metaTrackPurchase } }));
vi.mock('app/analytics/ga.service', () => ({ default: { trackPurchase: mocks.gaTrackPurchase } }));
vi.mock('app/analytics/impact.service', () => ({ trackPaymentConversion: mocks.trackPaymentConversion }));
vi.mock('utils/userStoragePolling.utils', () => ({ userStoragePolling: mocks.userStoragePolling }));
vi.mock('services/env.service', () => ({ default: { isProduction: mocks.isProduction, getVariable: vi.fn() } }));
vi.mock('app/i18n/provider/TranslationProvider', () => ({
  useTranslationContext: () => ({ translate: (key: string) => key, translateList: () => [] }),
}));
vi.mock('app/notifications/services/notifications.service', () => ({
  default: { show: mocks.notificationsShow },
  ToastType: { Error: 'error' },
}));
vi.mock('../services', () => ({
  paymentService: {
    getStripe: vi.fn().mockResolvedValue({
      retrievePaymentIntent: mocks.retrievePaymentIntent,
      retrieveSetupIntent: mocks.retrieveSetupIntent,
    }),
  },
}));

const SUCCESS_PATH = '/checkout/success';

// How the customer reaches this view depends on the payment method:
// - One-time payments (card, PayPal, Klarna, UPI, Pix on lifetime plans) are confirmed with a payment intent.
//   Stripe always redirects back to `return_url` and appends the payment intent secret.
// - Subscriptions set up through a setup intent (card, PayPal) come back with the setup intent secret instead.
// - Crypto payments and lifetime plans with a 100% off coupon are confirmed before the app navigates here,
//   so the URL carries no secret at all.
const returnFromStripeWithPaymentIntent = (clientSecret: string) =>
  `${SUCCESS_PATH}?payment_intent=pi_123&payment_intent_client_secret=${clientSecret}&redirect_status=succeeded`;
const returnFromStripeWithSetupIntent = (clientSecret: string) =>
  `${SUCCESS_PATH}?setup_intent=seti_123&setup_intent_client_secret=${clientSecret}&redirect_status=succeeded`;

// Statuses a customer can bring back after declining, abandoning or failing the payment at the provider
const FAILED_INTENT_STATUSES = ['requires_payment_method', 'canceled'];

const landOn = (url: string) => {
  globalThis.history.replaceState(null, '', url);
};

const renderAndWaitForRedirect = async () => {
  render(<CheckoutSuccessView />);
  await waitFor(() => expect(mocks.navigationPush).toHaveBeenCalledWith(AppView.Drive));
};

const expectPurchaseTracked = () => {
  expect(mocks.metaTrackPurchase).toHaveBeenCalledOnce();
  expect(mocks.gaTrackPurchase).toHaveBeenCalledOnce();
  expect(mocks.trackPaymentConversion).toHaveBeenCalledOnce();
};

const expectPurchaseNotTracked = () => {
  expect(mocks.metaTrackPurchase).not.toHaveBeenCalled();
  expect(mocks.gaTrackPurchase).not.toHaveBeenCalled();
  expect(mocks.trackPaymentConversion).not.toHaveBeenCalled();
};

const expectPaymentFailedNotified = () => {
  expect(mocks.notificationsShow).toHaveBeenCalledWith({ text: 'checkout.error.paymentFailed', type: 'error' });
};

const expectNoFailureNotified = () => {
  expect(mocks.notificationsShow).not.toHaveBeenCalled();
};

const expectCheckoutFinished = () => {
  PURCHASE_LOCAL_STORAGE_ITEMS.forEach((item) => expect(mocks.localStorageRemoveItem).toHaveBeenCalledWith(item));
  expect(mocks.userStoragePolling).toHaveBeenCalledOnce();
};

describe('Checkout success view', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    landOn(SUCCESS_PATH);
  });

  describe('When the customer paid without Stripe redirecting back (crypto, lifetime with a 100% off coupon)', () => {
    test('then the purchase is tracked without asking Stripe and the checkout is finished', async () => {
      await renderAndWaitForRedirect();

      expect(mocks.retrievePaymentIntent).not.toHaveBeenCalled();
      expect(mocks.retrieveSetupIntent).not.toHaveBeenCalled();
      expectPurchaseTracked();
      expectNoFailureNotified();
      expectCheckoutFinished();
    });
  });

  describe('When Stripe redirects back after a one-time payment (card, PayPal, Klarna, UPI, Pix)', () => {
    beforeEach(() => {
      landOn(returnFromStripeWithPaymentIntent('pi_123_secret_abc'));
    });

    test('and the payment intent succeeded, then the purchase is tracked and the checkout is finished', async () => {
      mocks.retrievePaymentIntent.mockResolvedValue({ paymentIntent: { status: 'succeeded' } });

      await renderAndWaitForRedirect();

      expect(mocks.retrievePaymentIntent).toHaveBeenCalledWith('pi_123_secret_abc');
      expect(mocks.retrieveSetupIntent).not.toHaveBeenCalled();
      expectPurchaseTracked();
      expectNoFailureNotified();
      expectCheckoutFinished();
    });

    test.each(FAILED_INTENT_STATUSES)(
      'and the payment intent ended as %s, then the user is notified, the purchase is not tracked and the checkout is still finished',
      async (status) => {
        mocks.retrievePaymentIntent.mockResolvedValue({ paymentIntent: { status } });

        await renderAndWaitForRedirect();

        expectPaymentFailedNotified();
        expectPurchaseNotTracked();
        expectCheckoutFinished();
      },
    );

    test('and Stripe cannot return the payment intent, then the user is notified and the purchase is not tracked', async () => {
      mocks.retrievePaymentIntent.mockResolvedValue({ error: { message: 'Invalid client secret' } });

      await renderAndWaitForRedirect();

      expectPaymentFailedNotified();
      expectPurchaseNotTracked();
      expectCheckoutFinished();
    });
  });

  describe('When Stripe redirects back after a subscription set up through a setup intent (card, PayPal)', () => {
    beforeEach(() => {
      landOn(returnFromStripeWithSetupIntent('seti_123_secret_abc'));
    });

    test('and the setup intent succeeded, then it is verified through its own endpoint and the purchase is tracked', async () => {
      mocks.retrieveSetupIntent.mockResolvedValue({ setupIntent: { status: 'succeeded' } });

      await renderAndWaitForRedirect();

      expect(mocks.retrieveSetupIntent).toHaveBeenCalledWith('seti_123_secret_abc');
      expect(mocks.retrievePaymentIntent).not.toHaveBeenCalled();
      expectPurchaseTracked();
      expectNoFailureNotified();
      expectCheckoutFinished();
    });

    test.each(FAILED_INTENT_STATUSES)(
      'and the setup intent ended as %s, then the user is notified, the purchase is not tracked and the checkout is still finished',
      async (status) => {
        mocks.retrieveSetupIntent.mockResolvedValue({ setupIntent: { status } });

        await renderAndWaitForRedirect();

        expect(mocks.retrievePaymentIntent).not.toHaveBeenCalled();
        expectPaymentFailedNotified();
        expectPurchaseNotTracked();
        expectCheckoutFinished();
      },
    );

    test('and Stripe cannot return the setup intent, then the user is notified and the purchase is not tracked', async () => {
      mocks.retrieveSetupIntent.mockResolvedValue({ error: { message: 'Invalid client secret' } });

      await renderAndWaitForRedirect();

      expectPaymentFailedNotified();
      expectPurchaseNotTracked();
      expectCheckoutFinished();
    });
  });

  describe('When the app is not running in production', () => {
    beforeEach(() => {
      mocks.isProduction.mockReturnValueOnce(false);
      landOn(returnFromStripeWithPaymentIntent('pi_123_secret_abc'));
    });

    test('then no purchase event is sent even though the payment succeeded, and the checkout is still finished', async () => {
      mocks.retrievePaymentIntent.mockResolvedValue({ paymentIntent: { status: 'succeeded' } });

      await renderAndWaitForRedirect();

      expect(mocks.retrievePaymentIntent).toHaveBeenCalledWith('pi_123_secret_abc');
      expectPurchaseNotTracked();
      expectNoFailureNotified();
      expectCheckoutFinished();
    });

    test('and the payment failed, then the user is still notified', async () => {
      mocks.retrievePaymentIntent.mockResolvedValue({ paymentIntent: { status: 'requires_payment_method' } });

      await renderAndWaitForRedirect();

      expectPaymentFailedNotified();
      expectPurchaseNotTracked();
    });
  });
});
