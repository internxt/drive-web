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
}));

vi.mock('app/store/hooks', () => ({ useAppDispatch: () => vi.fn() }));
vi.mock('services/navigation.service', () => ({ default: { push: mocks.navigationPush } }));
vi.mock('services/local-storage.service', () => ({ default: { removeItem: mocks.localStorageRemoveItem } }));
vi.mock('app/analytics/meta.service', () => ({ default: { trackPurchase: mocks.metaTrackPurchase } }));
vi.mock('app/analytics/ga.service', () => ({ default: { trackPurchase: mocks.gaTrackPurchase } }));
vi.mock('app/analytics/impact.service', () => ({ trackPaymentConversion: mocks.trackPaymentConversion }));
vi.mock('utils/userStoragePolling.utils', () => ({ userStoragePolling: mocks.userStoragePolling }));
vi.mock('../services', () => ({
  paymentService: {
    getStripe: vi.fn().mockResolvedValue({
      retrievePaymentIntent: mocks.retrievePaymentIntent,
      retrieveSetupIntent: mocks.retrieveSetupIntent,
    }),
  },
}));

const SUCCESS_PATH = '/checkout/success';

// Stripe appends these params to `return_url` when it redirects the customer back after confirming an intent
const returnFromStripeWithPaymentIntent = (clientSecret: string) =>
  `${SUCCESS_PATH}?payment_intent=pi_123&payment_intent_client_secret=${clientSecret}&redirect_status=succeeded`;
const returnFromStripeWithSetupIntent = (clientSecret: string) =>
  `${SUCCESS_PATH}?setup_intent=seti_123&setup_intent_client_secret=${clientSecret}&redirect_status=succeeded`;

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

describe('Checkout success view', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    landOn(SUCCESS_PATH);
  });

  test('When the user lands without being redirected by Stripe, then the purchase is tracked without asking Stripe', async () => {
    await renderAndWaitForRedirect();

    expect(mocks.retrievePaymentIntent).not.toHaveBeenCalled();
    expect(mocks.retrieveSetupIntent).not.toHaveBeenCalled();
    expectPurchaseTracked();
  });

  test('When Stripe reports the payment intent succeeded, then the purchase is tracked', async () => {
    landOn(returnFromStripeWithPaymentIntent('pi_123_secret_abc'));
    mocks.retrievePaymentIntent.mockResolvedValue({ paymentIntent: { status: 'succeeded' } });

    await renderAndWaitForRedirect();

    expect(mocks.retrievePaymentIntent).toHaveBeenCalledWith('pi_123_secret_abc');
    expectPurchaseTracked();
  });

  test('When Stripe reports the payment intent did not succeed, then the purchase is not tracked but the storage is cleaned up', async () => {
    landOn(returnFromStripeWithPaymentIntent('pi_123_secret_abc'));
    mocks.retrievePaymentIntent.mockResolvedValue({ paymentIntent: { status: 'requires_payment_method' } });

    await renderAndWaitForRedirect();

    expectPurchaseNotTracked();
    PURCHASE_LOCAL_STORAGE_ITEMS.forEach((item) => expect(mocks.localStorageRemoveItem).toHaveBeenCalledWith(item));
    expect(mocks.userStoragePolling).toHaveBeenCalledOnce();
  });

  test('When the confirmed intent is a setup intent, then it is verified through its own endpoint', async () => {
    landOn(returnFromStripeWithSetupIntent('seti_123_secret_abc'));
    mocks.retrieveSetupIntent.mockResolvedValue({ setupIntent: { status: 'succeeded' } });

    await renderAndWaitForRedirect();

    expect(mocks.retrieveSetupIntent).toHaveBeenCalledWith('seti_123_secret_abc');
    expect(mocks.retrievePaymentIntent).not.toHaveBeenCalled();
    expectPurchaseTracked();
  });

  test('When Stripe cannot return the intent, then the purchase is not tracked', async () => {
    landOn(returnFromStripeWithPaymentIntent('pi_123_secret_abc'));
    mocks.retrievePaymentIntent.mockResolvedValue({ error: { message: 'Invalid client secret' } });

    await renderAndWaitForRedirect();

    expectPurchaseNotTracked();
  });
});
