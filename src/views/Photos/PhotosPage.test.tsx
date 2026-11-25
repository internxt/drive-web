import { ReactNode } from 'react';
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import { Router } from 'react-router-dom';
import { createMemoryHistory } from 'history';
import { render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import PhotosPage from '.';

const { photosClient } = vi.hoisted(() => ({
  photosClient: { listDevices: vi.fn() },
}));

vi.mock('app/core/factory/sdk', () => ({
  SdkFactory: { getNewApiInstance: () => ({ createPhotosClient: () => photosClient }) },
}));
vi.mock('services/navigation.service', () => ({
  default: { push: vi.fn() },
}));
vi.mock('app/i18n/provider/TranslationProvider', () => ({
  useTranslationContext: () => ({ translate: (key: string) => key }),
}));
vi.mock('react-helmet-async', () => ({
  Helmet: () => null,
}));

const teamWorkspace = { workspaceUser: { workspaceId: 'team-workspace' } };

const renderPhotosPage = (selectedWorkspace: typeof teamWorkspace | null) => {
  const history = createMemoryHistory({ initialEntries: ['/recents', '/photos'], initialIndex: 1 });
  const store = configureStore({ reducer: { workspaces: () => ({ selectedWorkspace }) } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <Provider store={store}>
      <Router history={history}>{children}</Router>
    </Provider>
  );
  render(<PhotosPage />, { wrapper });
  return history;
};

describe('Photos page', () => {
  test('When the user opens Photos inside a workspace, then they are taken to the Drive of that workspace', () => {
    const history = renderPhotosPage(teamWorkspace);

    expect(history.location.pathname).toBe('/');
    expect(history.location.search).toBe('?workspaceid=team-workspace');
    expect(photosClient.listDevices).not.toHaveBeenCalled();
  });

  test('When the user goes back after being taken to the workspace Drive, then they return to where they were before Photos', () => {
    const history = renderPhotosPage(teamWorkspace);

    history.goBack();

    expect(history.location.pathname).toBe('/recents');
  });

  test('When the user opens Photos in their personal space, then the Photos page is shown', () => {
    photosClient.listDevices.mockReturnValue(new Promise(() => undefined));

    const history = renderPhotosPage(null);

    expect(screen.getByRole('heading', { name: 'views.photos.head' })).toBeInTheDocument();
    expect(history.location.pathname).toBe('/photos');
  });
});
