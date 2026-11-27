import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import { renderHook } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { AppView } from 'app/core/types';
import useLoginRedirections from './useLoginRedirections';

const user = {} as UserSettings;

const arrangeHook = (url: string) => {
  globalThis.history.replaceState({}, '', url);
  const navigateTo = vi.fn();
  const { result } = renderHook(() =>
    useLoginRedirections({
      navigateTo,
      processInvitation: vi.fn(),
      processWorkspaceInvitation: vi.fn(),
      showNotification: vi.fn(),
    }),
  );

  return { navigateTo, redirectWithCredentials: result.current.redirectWithCredentials };
};

afterEach(() => {
  globalThis.history.replaceState({}, '', '/');
});

test('when the user logs in from a login link that carries a shared folder, then they are taken to that shared folder', () => {
  const { navigateTo, redirectWithCredentials } = arrangeHook('/login?folderuuid=uuid-1');

  redirectWithCredentials(user, 'mnemonic');

  expect(navigateTo).toHaveBeenCalledWith(AppView.Shared, { folderuuid: 'uuid-1' });
});

test('when the user logs in from a plain login link, then they are taken to the Drive root without params', () => {
  const { navigateTo, redirectWithCredentials } = arrangeHook('/login');

  redirectWithCredentials(user, 'mnemonic');

  expect(navigateTo).toHaveBeenCalledWith(AppView.Drive, {});
});
