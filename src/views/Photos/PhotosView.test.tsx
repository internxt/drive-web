import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import errorService from 'services/error.service';
import PhotosView from './PhotosView';

const { photosClient } = vi.hoisted(() => ({
  photosClient: { listDevices: vi.fn() },
}));

vi.mock('app/core/factory/sdk', () => ({
  SdkFactory: { getNewApiInstance: () => ({ createPhotosClient: () => photosClient }) },
}));
vi.mock('app/i18n/provider/TranslationProvider', () => ({
  useTranslationContext: () => ({ translate: (key: string) => key }),
}));
vi.mock('react-helmet-async', () => ({
  Helmet: () => null,
}));
vi.mock('services/error.service', () => ({
  default: { reportError: vi.fn() },
}));

const device = (uuid: string, status: 'EXISTS' | 'TRASHED' | 'DELETED') => ({
  uuid,
  plainName: uuid,
  bucket: 'photos-bucket',
  status,
});

describe('Photos view', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('When the devices are loading, then the photos grid placeholder is shown under the title', () => {
    photosClient.listDevices.mockReturnValue(new Promise(() => undefined));

    render(<PhotosView />);

    expect(screen.getByRole('heading', { name: 'views.photos.head' })).toBeInTheDocument();
    expect(screen.getByTestId('photos-grid-skeleton')).toBeInTheDocument();
  });

  test('When the user has no devices with photo backup, then they are invited to install the mobile app', async () => {
    photosClient.listDevices.mockResolvedValue([]);

    render(<PhotosView />);

    expect(await screen.findByText('views.photos.empty.title')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'App Store' })).toHaveAttribute(
      'href',
      'https://apps.apple.com/es/app/internxt/id1465869889',
    );
    expect(screen.getByRole('link', { name: 'Google Play' })).toHaveAttribute(
      'href',
      'https://play.google.com/store/apps/details?id=com.internxt.cloud',
    );
    expect(screen.queryByTestId('photos-grid-skeleton')).not.toBeInTheDocument();
  });

  test('When every device was deleted, then the user is treated as having no devices', async () => {
    photosClient.listDevices.mockResolvedValue([device('old-phone', 'TRASHED'), device('tablet', 'DELETED')]);

    render(<PhotosView />);

    expect(await screen.findByText('views.photos.empty.title')).toBeInTheDocument();
  });

  test('When the user has devices, then the empty state is not shown', async () => {
    photosClient.listDevices.mockResolvedValue([device('iphone', 'EXISTS')]);

    render(<PhotosView />);

    await waitFor(() => expect(screen.queryByTestId('photos-grid-skeleton')).not.toBeInTheDocument());
    expect(screen.queryByText('views.photos.empty.title')).not.toBeInTheDocument();
    expect(screen.queryByText('views.photos.error.title')).not.toBeInTheDocument();
  });

  test('When the devices cannot be loaded, then the user can try again', async () => {
    photosClient.listDevices.mockRejectedValueOnce(new Error('Network error')).mockResolvedValueOnce([]);

    render(<PhotosView />);

    fireEvent.click(await screen.findByRole('button', { name: /views.photos.error.retry/ }));

    expect(await screen.findByText('views.photos.empty.title')).toBeInTheDocument();
    expect(photosClient.listDevices).toHaveBeenCalledTimes(2);
  });

  test('When the devices cannot be loaded, then the error is reported and no empty state is shown', async () => {
    const networkError = new Error('Network error');
    photosClient.listDevices.mockRejectedValue(networkError);

    render(<PhotosView />);

    await waitFor(() => expect(errorService.reportError).toHaveBeenCalledWith(networkError));
    expect(screen.queryByTestId('photos-grid-skeleton')).not.toBeInTheDocument();
    expect(screen.queryByText('views.photos.empty.title')).not.toBeInTheDocument();
  });
});
