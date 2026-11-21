import { MemoryRouter } from 'react-router-dom';
import { render } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { RootState } from 'app/store';
import { useAppSelector } from 'app/store/hooks';
import { AppView } from 'app/core/types';
import navigationService from 'services/navigation.service';
import HeaderAndSidenavLayout from './HeaderAndSidenavLayout';

vi.mock(import('app/store/hooks'), () => ({
  useAppDispatch: vi.fn(),
  useAppSelector: vi.fn(),
}));
vi.mock(import('hooks/useSubscriptionEnd'), () => ({
  useSubscriptionEnd: () => ({
    cancellationDate: undefined,
    isReactivatingSubscription: false,
    isSubscriptionEndingModalOpen: false,
    reactivateUserSubscription: vi.fn(),
    onModalClose: vi.fn(),
  }),
}));

const loggedOutState = {
  user: { isAuthenticated: false },
  ui: {},
  plan: { individualPlan: null, planLimit: 0, usageDetails: null },
  storage: { itemToShare: null },
} as RootState;

beforeEach(() => {
  vi.mocked(useAppSelector).mockImplementation((selector) => selector(loggedOutState));
});

afterEach(() => {
  globalThis.history.replaceState({}, '', '/');
});

test('when a logged-out user opens a shared folder link, then they are sent to login with that folder and the referral param kept', () => {
  const pushSpy = vi.spyOn(navigationService, 'push').mockImplementation(() => {});
  globalThis.history.replaceState({}, '', '/shared/?folderuuid=uuid-1&referral=open');

  render(
    <MemoryRouter>
      <HeaderAndSidenavLayout>
        <div />
      </HeaderAndSidenavLayout>
    </MemoryRouter>,
  );

  expect(pushSpy).toHaveBeenCalledWith(AppView.Login, { referral: 'open', folderuuid: 'uuid-1' });
});
