import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('app/store/hooks', () => ({
  useAppSelector: vi.fn(),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'es' } }),
}));

vi.mock('services/referral.service', () => ({
  default: {
    openPanel: vi.fn(),
  },
}));

vi.mock('services/navigation.service', () => ({
  default: {
    history: {
      replace: vi.fn(),
    },
  },
}));

vi.mock('services/error.service', () => ({
  default: {
    reportError: vi.fn(),
  },
}));

vi.mock('app/notifications/services/notifications.service', () => ({
  default: {
    show: vi.fn(),
  },
  ToastType: { Success: 'success', Error: 'error', Warning: 'warning', Info: 'info' },
}));

import { useReferralParamsChange } from './useReferralParamsChange';
import { useAppSelector } from 'app/store/hooks';
import referralService from 'services/referral.service';
import navigationService from 'services/navigation.service';
import errorService from 'services/error.service';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';

interface MockReferralUser {
  name: string;
  lastname: string;
  email: string;
  emailVerified: boolean;
}

interface MockState {
  user: { user: MockReferralUser | null };
  referrals: { isEligible: boolean };
}

const mockUseAppSelector = useAppSelector as ReturnType<typeof vi.fn>;
const mockOpenPanel = referralService.openPanel as ReturnType<typeof vi.fn>;
const mockHistoryReplace = navigationService.history.replace as ReturnType<typeof vi.fn>;
const mockReportError = errorService.reportError as ReturnType<typeof vi.fn>;
const mockNotificationsShow = notificationsService.show as ReturnType<typeof vi.fn>;

const mockUser: MockReferralUser = {
  name: 'John',
  lastname: 'Doe',
  email: 'john@doe.com',
  emailVerified: true,
};

const setStoreState = ({ user, isEligible }: { user: MockReferralUser | null; isEligible: boolean }) => {
  const state: MockState = { user: { user }, referrals: { isEligible } };
  mockUseAppSelector.mockImplementation((selector: (state: MockState) => unknown) => selector(state));
};

const setSearch = (search: string) => {
  globalThis.history.replaceState({}, '', `/${search}`);
};

const flush = () => new Promise((resolve) => setTimeout(resolve, 50));

describe('useReferralParamsChange', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockOpenPanel.mockResolvedValue(undefined);
    setStoreState({ user: mockUser, isEligible: true });
    setSearch('');
  });

  test('When an eligible user lands with the referral param, then it opens the panel with their details and removes the param from the URL', async () => {
    setSearch('?referral=open&workspaceid=123');

    renderHook(() => useReferralParamsChange());

    await waitFor(() => {
      expect(mockOpenPanel).toHaveBeenCalledWith(
        { name: 'John', lastname: 'Doe', email: 'john@doe.com', emailVerified: true },
        'es',
      );
    });
    expect(mockHistoryReplace).toHaveBeenCalledWith({ pathname: '/', search: '?workspaceid=123' });
  });

  test('When the user is not eligible, then the panel is not opened and the URL is untouched', async () => {
    setSearch('?referral=open');
    setStoreState({ user: mockUser, isEligible: false });

    renderHook(() => useReferralParamsChange());

    await flush();
    expect(mockOpenPanel).not.toHaveBeenCalled();
    expect(mockHistoryReplace).not.toHaveBeenCalled();
  });

  test('When the referral param is absent, then the panel is not opened', async () => {
    setSearch('?something=else');

    renderHook(() => useReferralParamsChange());

    await flush();
    expect(mockOpenPanel).not.toHaveBeenCalled();
  });

  test('When opening the panel fails, then it reports the error, shows an error notification and still cleans the URL', async () => {
    const error = new Error('boot failed');
    mockOpenPanel.mockRejectedValue(error);
    setSearch('?referral=open');

    renderHook(() => useReferralParamsChange());

    await waitFor(() => {
      expect(mockReportError).toHaveBeenCalledWith(error);
    });
    expect(mockNotificationsShow).toHaveBeenCalledWith({ text: 'referrals.openError', type: ToastType.Error });
    expect(mockHistoryReplace).toHaveBeenCalledWith({ pathname: '/', search: '' });
  });

  test('When the hook re-renders, then the panel is opened only once', async () => {
    setSearch('?referral=open');

    const { rerender } = renderHook(() => useReferralParamsChange());

    await waitFor(() => {
      expect(mockOpenPanel).toHaveBeenCalledTimes(1);
    });

    rerender();
    rerender();

    await flush();
    expect(mockOpenPanel).toHaveBeenCalledTimes(1);
  });
});
