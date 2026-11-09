import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import errorService from 'services/error.service';
import { PhotoDevice as SdkPhotoDevice } from '@internxt/sdk/dist/drive/photos';
import { getPhotoFolder, getPhotoFolderFile, getSdkPhotoDevice } from 'testUtils/fixtures/photos.fixtures';
import PhotosView from './PhotosView';

const { photosClient, storageClient } = vi.hoisted(() => ({
  photosClient: { listDevices: vi.fn(), getFilesInFolders: vi.fn() },
  storageClient: { getFolderFoldersByUuidWithCursor: vi.fn() },
}));

vi.mock('app/core/factory/sdk', () => ({
  SdkFactory: {
    getNewApiInstance: () => ({
      createPhotosClient: () => photosClient,
      createNewStorageClient: () => storageClient,
    }),
  },
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

type Folder = ReturnType<typeof getPhotoFolder>;

const givenDevices = (devices: SdkPhotoDevice[]) => photosClient.listDevices.mockResolvedValue(devices);

const givenSubfolders = (subfoldersByFolder: Record<string, Folder[]>) => {
  storageClient.getFolderFoldersByUuidWithCursor.mockImplementation((folderUuid: string) => [
    Promise.resolve({ folders: subfoldersByFolder[folderUuid] ?? [], nextCursor: null }),
    { cancel: vi.fn() },
  ]);
};

const givenPhotosInFolders = (photosByFolder: Record<string, ReturnType<typeof getPhotoFolderFile>[]>) => {
  photosClient.getFilesInFolders.mockImplementation(async ({ folderUuids }: { folderUuids: string[] }) => ({
    files: folderUuids.flatMap((folderUuid) => photosByFolder[folderUuid] ?? []),
    nextCursor: null,
  }));
};

const photo = (plainName: string, folderUuid: string, creationTime: string) =>
  getPhotoFolderFile({ uuid: plainName, plainName, type: 'jpg', folderUuid, creationTime });

const shownDays = () =>
  screen.getAllByRole('region').map((day) => [
    day.getAttribute('aria-label'),
    within(day)
      .getAllByRole('img')
      .map((tile) => tile.getAttribute('aria-label')),
  ]);

const iphone = getSdkPhotoDevice({ uuid: 'iphone', plainName: 'iPhone' });
const pixel = getSdkPhotoDevice({ uuid: 'pixel', plainName: 'Pixel' });

const iphonePhotosOfNovember2026 = {
  iphone: [getPhotoFolder({ uuid: 'iphone-2026', plainName: '2026' })],
  'iphone-2026': [getPhotoFolder({ uuid: 'iphone-2026-11', plainName: '11' })],
};

const pixelPhotosOfOctober2026 = {
  pixel: [getPhotoFolder({ uuid: 'pixel-2026', plainName: '2026' })],
  'pixel-2026': [getPhotoFolder({ uuid: 'pixel-2026-10', plainName: '10' })],
};

const waitForPhotosToLoad = () =>
  waitFor(() => expect(screen.queryByTestId('photos-grid-skeleton')).not.toBeInTheDocument());

describe('Photos view', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    givenSubfolders({});
    givenPhotosInFolders({});
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
    givenDevices([
      getSdkPhotoDevice({ uuid: 'old-phone', status: 'TRASHED' }),
      getSdkPhotoDevice({ uuid: 'tablet', status: 'DELETED' }),
    ]);

    render(<PhotosView />);

    expect(await screen.findByText('views.photos.empty.title')).toBeInTheDocument();
  });

  test('When the user has photos, then the empty state is not shown', async () => {
    givenDevices([iphone]);
    givenSubfolders(iphonePhotosOfNovember2026);

    render(<PhotosView />);

    await waitForPhotosToLoad();
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

  describe('Filtering by device', () => {
    const openDeviceFilter = async () => {
      fireEvent.click(await screen.findByRole('button', { name: /views.photos.filters.allDevices/ }));
    };

    test('When the user has a single device, then there is no device filter', async () => {
      givenDevices([iphone]);
      givenSubfolders(iphonePhotosOfNovember2026);

      render(<PhotosView />);

      await waitForPhotosToLoad();
      expect(screen.queryByRole('button', { name: /views.photos.filters.allDevices/ })).not.toBeInTheDocument();
    });

    test('When the user has several devices, then they can choose one of them', async () => {
      givenDevices([iphone, pixel]);
      givenSubfolders({ ...iphonePhotosOfNovember2026, ...pixelPhotosOfOctober2026 });

      render(<PhotosView />);
      await openDeviceFilter();

      expect((await screen.findAllByRole('menuitem')).map((option) => option.textContent)).toStrictEqual([
        'views.photos.filters.allDevices',
        'iPhone',
        'Pixel',
      ]);
      expect(screen.getByRole('menuitem', { name: /views.photos.filters.allDevices/ })).toHaveAttribute(
        'aria-current',
        'true',
      );
    });

    test('When the user chooses a device, then the filter shows it until they go back to all devices', async () => {
      givenDevices([iphone, pixel]);
      givenSubfolders({ ...iphonePhotosOfNovember2026, ...pixelPhotosOfOctober2026 });

      render(<PhotosView />);
      await openDeviceFilter();
      fireEvent.click(await screen.findByRole('menuitem', { name: /Pixel/ }));

      fireEvent.click(await screen.findByRole('button', { name: /Pixel/ }));
      expect(await screen.findByRole('menuitem', { name: /Pixel/ })).toHaveAttribute('aria-current', 'true');

      fireEvent.click(await screen.findByRole('menuitem', { name: /views.photos.filters.allDevices/ }));
      expect(await screen.findByRole('button', { name: /views.photos.filters.allDevices/ })).toBeInTheDocument();
    });
  });

  describe('Filtering by month', () => {
    const openMonthFilter = async () => {
      fireEvent.click(await screen.findByRole('button', { name: /views.photos.filters.allDates/ }));
    };

    const offeredMonths = async () => {
      const monthMenu = await screen.findByRole('menu', { name: /views.photos.filters.allDates/ });
      return within(monthMenu)
        .getAllByRole('menuitem')
        .map((option) => option.textContent);
    };

    test('When the user has photos in several months, then the months are offered newest first', async () => {
      givenDevices([iphone, pixel]);
      givenSubfolders({
        iphone: [
          getPhotoFolder({ uuid: 'iphone-2025', plainName: '2025' }),
          getPhotoFolder({ uuid: 'iphone-2026', plainName: '2026' }),
        ],
        'iphone-2025': [getPhotoFolder({ uuid: 'iphone-2025-12', plainName: '12' })],
        'iphone-2026': [getPhotoFolder({ uuid: 'iphone-2026-11', plainName: '11' })],
        pixel: [getPhotoFolder({ uuid: 'pixel-2026', plainName: '2026' })],
        'pixel-2026': [
          getPhotoFolder({ uuid: 'pixel-2026-11', plainName: '11' }),
          getPhotoFolder({ uuid: 'pixel-2026-01', plainName: '01' }),
        ],
      });

      render(<PhotosView />);
      await openMonthFilter();

      expect(await offeredMonths()).toStrictEqual([
        'views.photos.filters.allDates',
        'November 2026',
        'January 2026',
        'December 2025',
      ]);
    });

    test('When a device is chosen, then only the months with photos on that device are offered', async () => {
      givenDevices([iphone, pixel]);
      givenSubfolders({ ...iphonePhotosOfNovember2026, ...pixelPhotosOfOctober2026 });

      render(<PhotosView />);
      fireEvent.click(await screen.findByRole('button', { name: /views.photos.filters.allDevices/ }));
      fireEvent.click(await screen.findByRole('menuitem', { name: /Pixel/ }));
      await openMonthFilter();

      expect(await offeredMonths()).toStrictEqual(['views.photos.filters.allDates', 'October 2026']);
    });

    test('When the user chooses another device, then the date filter goes back to all dates', async () => {
      givenDevices([iphone, pixel]);
      givenSubfolders({ ...iphonePhotosOfNovember2026, ...pixelPhotosOfOctober2026 });

      render(<PhotosView />);
      await openMonthFilter();
      fireEvent.click(await screen.findByRole('menuitem', { name: /November 2026/ }));
      fireEvent.click(await screen.findByRole('button', { name: /views.photos.filters.allDevices/ }));
      fireEvent.click(await screen.findByRole('menuitem', { name: /Pixel/ }));

      expect(await screen.findByRole('button', { name: /views.photos.filters.allDates/ })).toBeInTheDocument();
    });

    test('When the user goes back to the previous device, then the month chosen before is not restored', async () => {
      givenDevices([iphone, pixel]);
      givenSubfolders({ ...iphonePhotosOfNovember2026, ...pixelPhotosOfOctober2026 });

      render(<PhotosView />);
      fireEvent.click(await screen.findByRole('button', { name: /views.photos.filters.allDevices/ }));
      fireEvent.click(await screen.findByRole('menuitem', { name: /iPhone/ }));
      await openMonthFilter();
      fireEvent.click(await screen.findByRole('menuitem', { name: /November 2026/ }));
      fireEvent.click(await screen.findByRole('button', { name: /iPhone/ }));
      fireEvent.click(await screen.findByRole('menuitem', { name: /Pixel/ }));
      fireEvent.click(await screen.findByRole('button', { name: /Pixel/ }));
      fireEvent.click(await screen.findByRole('menuitem', { name: /iPhone/ }));

      expect(await screen.findByRole('button', { name: /views.photos.filters.allDates/ })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /November 2026/ })).not.toBeInTheDocument();
    });

    test('When the devices have no photos yet, then the empty state is shown without filters', async () => {
      givenDevices([iphone]);

      render(<PhotosView />);

      expect(await screen.findByText('views.photos.empty.title')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /views.photos.filters.allDates/ })).not.toBeInTheDocument();
    });

    test('When the months cannot be found, then the user can try again', async () => {
      givenDevices([iphone]);
      givenSubfolders(iphonePhotosOfNovember2026);
      storageClient.getFolderFoldersByUuidWithCursor.mockImplementationOnce(() => [
        Promise.reject(new Error('Network error')),
        { cancel: vi.fn() },
      ]);

      render(<PhotosView />);
      fireEvent.click(await screen.findByRole('button', { name: /views.photos.error.retry/ }));

      expect(await screen.findByRole('button', { name: /views.photos.filters.allDates/ })).toBeInTheDocument();
    });
  });

  test('When the devices cannot be loaded, then the error is reported and no empty state is shown', async () => {
    const networkError = new Error('Network error');
    photosClient.listDevices.mockRejectedValue(networkError);

    render(<PhotosView />);

    await waitFor(() => expect(errorService.reportError).toHaveBeenCalledWith(networkError));
    expect(screen.queryByTestId('photos-grid-skeleton')).not.toBeInTheDocument();
    expect(screen.queryByText('views.photos.empty.title')).not.toBeInTheDocument();
  });

  describe('Browsing the photos', () => {
    const iphonePhotosOf2025 = {
      iphone: [getPhotoFolder({ uuid: 'iphone-2025', plainName: '2025' })],
      'iphone-2025': [
        getPhotoFolder({ uuid: 'iphone-2025-11', plainName: '11' }),
        getPhotoFolder({ uuid: 'iphone-2025-10', plainName: '10' }),
      ],
      'iphone-2025-11': [
        getPhotoFolder({ uuid: 'iphone-2025-11-01', plainName: '1' }),
        getPhotoFolder({ uuid: 'iphone-2025-11-03', plainName: '03' }),
      ],
      'iphone-2025-10': [getPhotoFolder({ uuid: 'iphone-2025-10-15', plainName: '15' })],
    };

    test('When the user opens Photos, then the newest month is shown day by day, newest first', async () => {
      givenDevices([iphone]);
      givenSubfolders(iphonePhotosOf2025);
      givenPhotosInFolders({
        'iphone-2025-11-01': [photo('IMG_C', 'iphone-2025-11-01', '2025-11-01T10:00:00Z')],
        'iphone-2025-11-03': [
          photo('IMG_A', 'iphone-2025-11-03', '2025-11-03T09:00:00Z'),
          photo('IMG_B', 'iphone-2025-11-03', '2025-11-03T20:00:00Z'),
        ],
        'iphone-2025-10-15': [photo('IMG_D', 'iphone-2025-10-15', '2025-10-15T10:00:00Z')],
      });

      render(<PhotosView />);
      await screen.findAllByRole('region');

      expect(shownDays()).toStrictEqual([
        ['Mon, 3 Nov 2025', ['IMG_B.jpg', 'IMG_A.jpg']],
        ['Sat, 1 Nov 2025', ['IMG_C.jpg']],
      ]);
    });

    test('When the user picks an older month, then its photos are shown', async () => {
      givenDevices([iphone]);
      givenSubfolders(iphonePhotosOf2025);
      givenPhotosInFolders({
        'iphone-2025-11-03': [photo('IMG_NOVEMBER', 'iphone-2025-11-03', '2025-11-03T09:00:00Z')],
        'iphone-2025-10-15': [photo('IMG_OCTOBER', 'iphone-2025-10-15', '2025-10-15T10:00:00Z')],
      });

      render(<PhotosView />);
      fireEvent.click(await screen.findByRole('button', { name: /views.photos.filters.allDates/ }));
      fireEvent.click(await screen.findByRole('menuitem', { name: /October 2025/ }));

      expect(await screen.findByRole('region', { name: 'Wed, 15 Oct 2025' })).toBeInTheDocument();
      expect(shownDays()).toStrictEqual([['Wed, 15 Oct 2025', ['IMG_OCTOBER.jpg']]]);
    });

    test('When the photos of a day come from several devices, then they are shown together', async () => {
      givenDevices([iphone, pixel]);
      givenSubfolders({
        iphone: [getPhotoFolder({ uuid: 'iphone-2025', plainName: '2025' })],
        'iphone-2025': [getPhotoFolder({ uuid: 'iphone-2025-11', plainName: '11' })],
        'iphone-2025-11': [getPhotoFolder({ uuid: 'iphone-2025-11-03', plainName: '3' })],
        pixel: [getPhotoFolder({ uuid: 'pixel-2025', plainName: '2025' })],
        'pixel-2025': [getPhotoFolder({ uuid: 'pixel-2025-11', plainName: '11' })],
        'pixel-2025-11': [getPhotoFolder({ uuid: 'pixel-2025-11-03', plainName: '3' })],
      });
      givenPhotosInFolders({
        'iphone-2025-11-03': [photo('IMG_IPHONE', 'iphone-2025-11-03', '2025-11-03T09:00:00Z')],
        'pixel-2025-11-03': [photo('IMG_PIXEL', 'pixel-2025-11-03', '2025-11-03T12:00:00Z')],
      });

      render(<PhotosView />);
      await screen.findAllByRole('region');

      expect(shownDays()).toStrictEqual([['Mon, 3 Nov 2025', ['IMG_PIXEL.jpg', 'IMG_IPHONE.jpg']]]);
    });

    test('When the photos cannot be loaded, then the user can try again', async () => {
      givenDevices([iphone]);
      givenSubfolders(iphonePhotosOf2025);
      givenPhotosInFolders({
        'iphone-2025-11-03': [photo('IMG_A', 'iphone-2025-11-03', '2025-11-03T09:00:00Z')],
      });
      photosClient.getFilesInFolders.mockRejectedValueOnce(new Error('Network error'));

      render(<PhotosView />);
      fireEvent.click(await screen.findByRole('button', { name: /views.photos.error.retry/ }));

      expect(await screen.findByRole('img', { name: 'IMG_A.jpg' })).toBeInTheDocument();
    });
  });
});
