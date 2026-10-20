import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LocalStorageItem } from 'app/core/types';
import { trackCheckoutCompleted } from './analytics.service';

const mocks = vi.hoisted(() => ({
  localStorageGet: vi.fn(),
  localStorageRemoveItem: vi.fn(),
  getCookie: vi.fn(),
  getUser: vi.fn(),
  sendPurchaseEvents: vi.fn(),
  isProduction: vi.fn(),
  notificationsShow: vi.fn(),
}));

vi.mock('./utils', () => ({ getCookie: mocks.getCookie }));
vi.mock('services/local-storage.service', () => ({
  default: { get: mocks.localStorageGet, removeItem: mocks.localStorageRemoveItem },
}));
vi.mock('services/encrypted-storage.service', () => ({ default: { getUser: mocks.getUser } }));
vi.mock('services/env.service', () => ({
  default: { isProduction: mocks.isProduction, getVariable: vi.fn() },
}));
vi.mock('@internxt/analytics', () => ({ sendPurchaseEvents: mocks.sendPurchaseEvents }));
vi.mock('app/notifications/services/notifications.service', () => ({
  default: { show: mocks.notificationsShow },
  ToastType: { Error: 'error' },
}));
vi.mock('views/Checkout/services', () => ({ paymentService: { getStripe: vi.fn() } }));

const COLLABORATOR_UTM_SOURCE = 'S42MF2';
const COLLABORATOR_CLICK_ID = 'click_123';
const LOGGED_IN_BUYER = { uuid: 'user_123', email: 'buyer@internxt.com' };
const translate = (key: string) => key;

const PURCHASE_DATA: Partial<Record<string, string>> = {
  [LocalStorageItem.IsFirstPurchase]: 'true',
  [LocalStorageItem.SubscriptionID]: 'sub_123',
  [LocalStorageItem.AmountPaid]: '9.99',
};

const givenStoredData = (data: Partial<Record<string, string>>) => {
  mocks.localStorageGet.mockImplementation((key) => data[key] ?? null);
};

const givenPurchaseFrom = (utmSource: string | undefined) => {
  const cookies: Partial<Record<string, string>> = {
    postbackPartner: utmSource,
    postbackClickId: COLLABORATOR_CLICK_ID,
  };

  mocks.getCookie.mockImplementation((name: string) => cookies[name]);
};

describe('Purchase tracking', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isProduction.mockReturnValue(true);
    mocks.getUser.mockResolvedValue(LOGGED_IN_BUYER);
    givenPurchaseFrom(COLLABORATOR_UTM_SOURCE);
    givenStoredData(PURCHASE_DATA);
    fetchMock = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('fetch', fetchMock);
  });

  it('When a logged-in buyer comes from a collaborator with its own postback, then the postback is sent along with the usual trackers', async () => {
    await trackCheckoutCompleted(translate);

    expect(mocks.sendPurchaseEvents).toHaveBeenCalledExactlyOnceWith({
      id: LOGGED_IN_BUYER.uuid,
      email: LOGGED_IN_BUYER.email,
    });
    expect(fetchMock).toHaveBeenCalledOnce();

    const url = new URL(fetchMock.mock.calls[0][0] as string);
    expect(url.host).toBe('www.p0stb4ck.com');
    expect(url.searchParams.get('transaction_id')).toBe(COLLABORATOR_CLICK_ID);
    expect(url.searchParams.get('amount')).toBe('9.99');
  });

  it('When a buyer without an account comes from the collaborator, then the postback is sent for the purchase they just made', async () => {
    mocks.getUser.mockResolvedValue(undefined);
    givenStoredData({
      ...PURCHASE_DATA,
      [LocalStorageItem.CheckoutCustomerId]: 'cus_123',
      [LocalStorageItem.CheckoutAccountSetupEmail]: 'new.buyer@internxt.com',
    });

    await trackCheckoutCompleted(translate);

    expect(mocks.sendPurchaseEvents).toHaveBeenCalledExactlyOnceWith({
      id: 'cus_123',
      email: 'new.buyer@internxt.com',
    });
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('When the purchase comes from anywhere else, then the usual trackers are sent and no postback is sent', async () => {
    givenPurchaseFrom(undefined);

    await trackCheckoutCompleted(translate);

    expect(mocks.sendPurchaseEvents).toHaveBeenCalledOnce();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('When there is no buyer to attribute the purchase to, then the trackers are told so and no postback is sent', async () => {
    mocks.getUser.mockResolvedValue(undefined);

    await trackCheckoutCompleted(translate);

    expect(mocks.sendPurchaseEvents).toHaveBeenCalledExactlyOnceWith(null);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('When tracking outside production, then nothing is sent to the collaborator', async () => {
    mocks.isProduction.mockReturnValue(false);

    await trackCheckoutCompleted(translate);

    expect(mocks.sendPurchaseEvents).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('When the collaborator endpoint fails, then the rest of the checkout is not affected', async () => {
    fetchMock.mockRejectedValue(new Error('Network error'));

    await expect(trackCheckoutCompleted(translate)).resolves.toBeUndefined();
    expect(mocks.notificationsShow).not.toHaveBeenCalled();
  });

  it('When the checkout has been tracked, then the payment data is cleared so it is only reported once', async () => {
    await trackCheckoutCompleted(translate);

    expect(mocks.localStorageRemoveItem).toHaveBeenCalledWith(LocalStorageItem.SubscriptionID);
    expect(mocks.localStorageRemoveItem).toHaveBeenCalledWith(LocalStorageItem.AmountPaid);
  });
});
