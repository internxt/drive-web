import { render, screen, waitFor } from '@testing-library/react';
import { AppView, LocalStorageItem } from 'app/core/types';
import enTranslations from 'app/i18n/locales/en.json';
import encryptedStorageService from 'services/encrypted-storage.service';
import localStorageService from 'services/local-storage.service';
import navigationService from 'services/navigation.service';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import CheckoutSuccessView from './CheckoutSuccessView';

const translate = (key: string) => {
  const value = key.split('.').reduce<unknown>((accumulator, part) => accumulator?.[part], enTranslations);

  if (typeof value !== 'string') {
    throw new Error(`Missing translation for "${key}"`);
  }

  return value;
};

vi.mock('app/i18n/provider/TranslationProvider', () => ({
  useTranslationContext: () => ({ translate }),
}));

vi.mock('app/store/hooks', () => ({
  useAppDispatch: () => vi.fn(),
}));

vi.mock('app/analytics/ga.service', async (importOriginal) => {
  const original = await importOriginal<typeof import('app/analytics/ga.service')>();
  return { ...original, default: { ...original.default, trackPurchase: vi.fn() } };
});
vi.mock('app/analytics/meta.service', async (importOriginal) => {
  const original = await importOriginal<typeof import('app/analytics/meta.service')>();
  return { ...original, default: { ...original.default, trackPurchase: vi.fn() } };
});
vi.mock('app/analytics/impact.service', async (importOriginal) => ({
  ...(await importOriginal<typeof import('app/analytics/impact.service')>()),
  trackPaymentConversion: vi.fn(),
}));

vi.mock('utils/userStoragePolling.utils', () => ({
  userStoragePolling: vi.fn(),
}));

const { checkEmail } = enTranslations.checkout.accountSetup;

describe('Checkout success', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.spyOn(navigationService, 'push').mockImplementation(() => undefined);
  });

  test('When a buyer without an account finishes paying, then they are asked to check the email the setup link was sent to', async () => {
    vi.spyOn(encryptedStorageService, 'getToken').mockReturnValue(undefined);
    localStorageService.set(LocalStorageItem.CheckoutAccountSetupEmail, 'new.buyer@internxt.com');
    localStorageService.set(LocalStorageItem.SubscriptionID, 'sub_123');

    render(<CheckoutSuccessView />);

    expect(await screen.findByText(checkEmail.title)).toBeInTheDocument();
    expect(screen.getByText('new.buyer@internxt.com')).toBeInTheDocument();
    expect(screen.getByText(checkEmail.spamHint)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: enTranslations.checkout.accountSetup.resendEmail })).toBeInTheDocument();
    await waitFor(() => expect(localStorageService.get(LocalStorageItem.SubscriptionID)).toBeNull());
    expect(navigationService.push).not.toHaveBeenCalled();
  });

  test('When a logged-in user finishes paying, then they are taken to Drive', async () => {
    vi.spyOn(encryptedStorageService, 'getToken').mockReturnValue('session_token');
    localStorageService.set(LocalStorageItem.CheckoutAccountSetupEmail, 'old.buyer@internxt.com');

    render(<CheckoutSuccessView />);

    await waitFor(() => expect(navigationService.push).toHaveBeenCalledWith(AppView.Drive));
    expect(screen.queryByText(checkEmail.title)).not.toBeInTheDocument();
    expect(localStorageService.get(LocalStorageItem.CheckoutAccountSetupEmail)).toBeNull();
  });
});
