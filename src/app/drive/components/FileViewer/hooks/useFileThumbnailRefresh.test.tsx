import { ReactNode } from 'react';
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import { renderHook } from '@testing-library/react';
import { Thumbnail } from '@internxt/sdk/dist/drive/storage/types';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { DriveItemData } from 'app/drive/types';
import { PreviewFileItem } from 'app/share/types';
import storageReducer, { storageActions } from 'app/store/slices/storage';
import errorService from 'services/error.service';
import { useFileThumbnailRefresh } from './useFileThumbnailRefresh';

const { storedPreviews, createThumbnailEntry, uploadToBucket, THUMBNAIL_FILE } = vi.hoisted(() => ({
  storedPreviews: new Map<number, Blob>(),
  createThumbnailEntry: vi.fn(),
  uploadToBucket: vi.fn(),
  THUMBNAIL_FILE: new File(['thumbnail'], 'thumbnail.png', { type: 'image/png' }),
}));

vi.mock('react-image-file-resizer', () => ({
  __esModule: true,
  default: { imageFileResizer: (...args: unknown[]) => (args[6] as (file: File) => void)(THUMBNAIL_FILE) },
}));
vi.mock('app/drive/services/database.service', () => ({
  canFileBeCached: vi.fn(),
  deleteDatabaseItems: vi.fn(),
  getDatabaseFileSourceData: vi.fn(),
  updateDatabaseFileSourceData: vi.fn(),
  getDatabaseProfileAvatar: vi.fn(),
  updateDatabaseProfileAvatar: vi.fn(),
  deleteDatabaseProfileAvatar: vi.fn(),
  getDatabaseWorkspaceAvatar: vi.fn(),
  updateDatabaseWorkspaceAvatar: vi.fn(),
  deleteDatabaseWorkspaceAvatar: vi.fn(),
  getDatabaseFilePreviewData: async ({ fileId }: { fileId: number }) => storedPreviews.get(fileId),
  updateDatabaseFilePreviewData: async ({ fileId, previewBlob }: { fileId: number; previewBlob: Blob }) => {
    storedPreviews.set(fileId, previewBlob);
  },
}));
vi.mock('app/drive/services/network.service/getEnvironmentConfig', () => ({
  getEnvironmentConfig: async () => ({ bridgeUser: 'user', bridgePass: 'pass', encryptionKey: 'key', bucketId: 'b' }),
}));
vi.mock('app/network/upload', () => ({ uploadFile: uploadToBucket }));
vi.mock('app/core/factory/sdk', () => ({
  SdkFactory: {
    getNewApiInstance: () => ({
      createNewStorageClient: () => ({ createThumbnailEntryWithUUID: createThumbnailEntry }),
    }),
  },
}));
vi.mock('services/error.service', () => ({ default: { reportError: vi.fn() } }));

const OWNER_UUID = 'owner-uuid';
const FOLDER_UUID = 'folder-uuid';

const thumbnail = (overrides: Partial<Thumbnail> = {}): Thumbnail =>
  ({ id: 1, type: 'png', size: THUMBNAIL_FILE.size, max_width: 300, max_height: 300, ...overrides }) as Thumbnail;

const UPLOADED_THUMBNAIL = thumbnail({ id: 99, bucket_file: 'uploaded' });

const createFile = (overrides: Partial<PreviewFileItem> = {}): PreviewFileItem =>
  ({
    id: 1,
    uuid: 'file-uuid',
    name: 'photo',
    type: 'png',
    size: 1024,
    folderId: 10,
    folderUuid: FOLDER_UUID,
    updatedAt: '2026-01-01',
    thumbnails: [],
    isFolder: false,
    ...overrides,
  }) as unknown as PreviewFileItem;

const createImageContent = (): Promise<Blob> =>
  new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    canvas.width = 4;
    canvas.height = 4;
    canvas.toBlob((blob) => resolve(blob as Blob), 'image/png');
  });

const renderRefresh = (file: PreviewFileItem, { isSharedView = false, currentUserUuid = OWNER_UUID } = {}) => {
  const store = configureStore({
    reducer: { storage: storageReducer, user: (state = { user: { uuid: currentUserUuid } }) => state },
  });
  store.dispatch(storageActions.setItems({ folderId: FOLDER_UUID, items: [file as unknown as DriveItemData] }));

  const { result } = renderHook(() => useFileThumbnailRefresh({ isSharedView, isWorkspace: false }), {
    wrapper: ({ children }: { children: ReactNode }) => <Provider store={store}>{children}</Provider>,
  });

  return {
    refreshThumbnail: result.current.refreshThumbnail,
    getItem: () => store.getState().storage.levels[FOLDER_UUID][0],
  };
};

describe('Refreshing the thumbnail of a previewed file', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    storedPreviews.clear();
    uploadToBucket.mockResolvedValue('uploaded');
    createThumbnailEntry.mockResolvedValue(UPLOADED_THUMBNAIL);
  });

  test('When a file without thumbnail is previewed, then a new one is uploaded, shown in the list and stored locally', async () => {
    const createObjectURL = vi.spyOn(URL, 'createObjectURL');
    const { refreshThumbnail, getItem } = renderRefresh(createFile());

    await refreshThumbnail(createFile(), await createImageContent());

    expect(getItem().thumbnails).toStrictEqual([UPLOADED_THUMBNAIL]);
    expect(getItem().currentThumbnail).toMatchObject({ id: UPLOADED_THUMBNAIL.id, urlObject: expect.any(String) });
    expect(createObjectURL.mock.calls.filter(([source]) => source === THUMBNAIL_FILE)).toHaveLength(1);
    expect(storedPreviews.get(1)).toBe(THUMBNAIL_FILE);
  });

  test('When the generated thumbnail differs from the current one, then it replaces it instead of being added', async () => {
    const otherThumbnail = thumbnail({ id: 2 });
    const file = createFile({ thumbnails: [thumbnail({ size: 1 }), otherThumbnail] });
    const { refreshThumbnail, getItem } = renderRefresh(file);

    await refreshThumbnail(file, await createImageContent());

    expect(getItem().thumbnails).toStrictEqual([UPLOADED_THUMBNAIL, otherThumbnail]);
  });

  test('When the generated thumbnail is the same as the current one, then nothing is uploaded and it is stored locally if missing', async () => {
    const file = createFile({ thumbnails: [thumbnail()] });
    const { refreshThumbnail } = renderRefresh(file);

    await refreshThumbnail(file, await createImageContent());

    expect(uploadToBucket).not.toHaveBeenCalled();
    expect(storedPreviews.get(1)?.size).toBe(THUMBNAIL_FILE.size);
  });

  test('When a file shared by someone else is previewed, then its thumbnail is left untouched', async () => {
    const file = createFile({ user: { uuid: 'someone-else' } as PreviewFileItem['user'] });
    const { refreshThumbnail, getItem } = renderRefresh(file, { isSharedView: true });

    await refreshThumbnail(file, await createImageContent());

    expect(uploadToBucket).not.toHaveBeenCalled();
    expect(getItem().thumbnails).toStrictEqual([]);
    expect(storedPreviews.size).toBe(0);
  });

  test('When a file shared by the current user is previewed, then its thumbnail is refreshed', async () => {
    const file = createFile({ user: { uuid: OWNER_UUID } as PreviewFileItem['user'] });
    const { refreshThumbnail, getItem } = renderRefresh(file, { isSharedView: true });

    await refreshThumbnail(file, await createImageContent());

    expect(getItem().thumbnails).toStrictEqual([UPLOADED_THUMBNAIL]);
  });

  test('When no thumbnail can be generated from the content, then nothing is uploaded', async () => {
    const { refreshThumbnail, getItem } = renderRefresh(createFile());

    await refreshThumbnail(createFile(), new Blob(['not an image'], { type: 'image/png' }));

    expect(uploadToBucket).not.toHaveBeenCalled();
    expect(getItem().thumbnails).toStrictEqual([]);
  });

  test('When uploading the thumbnail fails, then the error is reported without failing the preview', async () => {
    const error = new Error('upload failed');
    uploadToBucket.mockRejectedValue(error);
    const { refreshThumbnail } = renderRefresh(createFile());

    await expect(refreshThumbnail(createFile(), await createImageContent())).resolves.toBeUndefined();

    expect(errorService.reportError).toHaveBeenCalledWith(error);
  });
});
