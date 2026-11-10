import { ReactNode } from 'react';
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import { renderHook } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { AppView } from 'app/core/types';
import { navigationService } from 'services';
import { useSidenavNavigation } from './useSidenavNavigation';

vi.mock('services', () => ({
  navigationService: { push: vi.fn() },
}));
vi.mock('app/i18n/provider/TranslationProvider', () => ({
  useTranslationContext: () => ({ translate: (key: string) => key }),
}));

const teamWorkspace = { workspaceUser: { workspaceId: 'team-workspace' } };

const renderSidenav = (selectedWorkspace: typeof teamWorkspace | null = null) => {
  const store = configureStore({
    reducer: {
      workspaces: () => ({ selectedWorkspace }),
      shared: () => ({ pendingInvitations: [] }),
    },
  });
  return renderHook(() => useSidenavNavigation(), {
    wrapper: ({ children }: { children: ReactNode }) => <Provider store={store}>{children}</Provider>,
  }).result.current.itemsNavigation;
};

const visibleLabels = (items: ReturnType<typeof renderSidenav>) =>
  items.filter((item) => item.isVisible).map((item) => item.label);

const itemLabelled = (items: ReturnType<typeof renderSidenav>, label: string) =>
  items.find((item) => item.label === label);

describe('Sidenav', () => {
  test('When the user is in their personal space, then Photos appears below Drive and before Favorites', () => {
    const items = renderSidenav();

    expect(visibleLabels(items)).toStrictEqual([
      'sideNav.drive',
      'sideNav.photos',
      'sideNav.favorites',
      'sideNav.backups',
      'sideNav.shared',
      'sideNav.recents',
      'sideNav.trash',
      'sideNav.desktop',
    ]);
  });

  test('When the user clicks Photos, then the Photos page opens', () => {
    const items = renderSidenav();

    itemLabelled(items, 'sideNav.photos')?.onClick?.();

    expect(navigationService.push).toHaveBeenCalledWith(AppView.Photos, {}, undefined);
  });

  test('When the user is inside a workspace, then Photos is not offered', () => {
    const items = renderSidenav(teamWorkspace);

    expect(visibleLabels(items)).not.toContain('sideNav.photos');
  });

  test('When the user clicks Drive, then Drive still opens', () => {
    const items = renderSidenav();

    itemLabelled(items, 'sideNav.drive')?.onClick?.();

    expect(navigationService.push).toHaveBeenCalledWith(AppView.Drive, {}, undefined);
  });
});
