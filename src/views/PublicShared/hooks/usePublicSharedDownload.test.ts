/**
 * @jest-environment jsdom
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { AdvancedSharedItem } from 'app/share/types';
import usePublicSharedDownload from './usePublicSharedDownload';

vi.mock('app/network/download', () => ({
  downloadFile: vi.fn(),
}));

vi.mock('app/share/services/share.service', () => ({
  downloadPublicSharedItems: vi.fn(),
}));

vi.mock('services/stream.service', () => ({
  binaryStreamToBlob: vi.fn(),
}));

vi.mock('services', () => ({
  isFileSizePreviewable: vi.fn().mockReturnValue(true),
}));

vi.mock('app/drive/components/FileViewer/utils/fileViewerUtils', () => ({
  getIsTypeAllowedAndFileExtensionGroupValues: vi.fn().mockReturnValue({ isTypeAllowed: true }),
}));

vi.mock('services/error.service', () => ({
  default: {
    reportError: vi.fn(),
    castError: vi.fn().mockImplementation((e) => ({ message: e.message ?? 'Default error message' })),
  },
}));

vi.mock('app/notifications/services/notifications.service', () => ({
  default: {
    show: vi.fn(),
  },
  ToastType: {
    Error: 'error',
  },
}));

import { downloadFile } from 'app/network/download';
import notificationsService from 'app/notifications/services/notifications.service';
import { downloadPublicSharedItems } from 'app/share/services/share.service';
import { binaryStreamToBlob } from 'services/stream.service';

const mockedDownloadFile = vi.mocked(downloadFile);
const mockedDownloadPublicSharedItems = vi.mocked(downloadPublicSharedItems);
const mockedBinaryStreamToBlob = vi.mocked(binaryStreamToBlob);

const CREDENTIALS = { user: 'network-user', pass: 'network-pass' };
const PUBLIC_SHARE_KEY = { mnemonic: 'mnemonic' };
const CODE = 'plain-code';

const createFileItem = (overrides: Partial<AdvancedSharedItem> = {}): AdvancedSharedItem =>
  ({
    id: 1,
    uuid: 'file-uuid',
    plainName: 'file',
    name: 'encrypted-name',
    type: 'png',
    size: '100',
    bucket: 'bucket-id',
    fileId: 'network-file-id',
    isFolder: false,
    ...overrides,
  }) as AdvancedSharedItem;

const createDeferred = <T>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

const renderDownloadHook = ({ withCredentials = true }: { withCredentials?: boolean } = {}) =>
  renderHook(() =>
    usePublicSharedDownload({
      credentials: withCredentials ? CREDENTIALS : undefined,
      publicShareKey: PUBLIC_SHARE_KEY,
      code: CODE,
      resourcesToken: 'resources-token',
    }),
  );

describe('usePublicSharedDownload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('openPreview', () => {
    test('When a previewable file is opened, then its blob is downloaded and exposed', async () => {
      const fileStream = new ReadableStream();
      const fileBlob = new Blob(['content']);
      mockedDownloadFile.mockResolvedValue(fileStream);
      mockedBinaryStreamToBlob.mockResolvedValue(fileBlob);
      const item = createFileItem();

      const { result } = renderDownloadHook();
      act(() => {
        result.current.openPreview(item);
      });

      expect(result.current.previewItem).toBe(item);
      await waitFor(() => {
        expect(result.current.previewBlob).toBe(fileBlob);
      });
      expect(mockedDownloadFile).toHaveBeenCalledWith(
        expect.objectContaining({ bucketId: 'bucket-id', fileId: 'network-file-id', creds: CREDENTIALS }),
      );
    });

    test('When the preview is closed before the download finishes, then the stale blob is discarded', async () => {
      const deferred = createDeferred<ReadableStream>();
      mockedDownloadFile.mockReturnValue(deferred.promise);
      mockedBinaryStreamToBlob.mockResolvedValue(new Blob(['stale']));

      const { result } = renderDownloadHook();
      act(() => {
        result.current.openPreview(createFileItem());
      });
      act(() => {
        result.current.closePreview();
      });
      await act(async () => {
        deferred.resolve(new ReadableStream());
        await deferred.promise;
      });

      expect(result.current.previewItem).toBeNull();
      expect(result.current.previewBlob).toBeNull();
    });

    test('When another file is opened before the first download finishes, then only the last file blob is applied', async () => {
      const firstDeferred = createDeferred<ReadableStream>();
      const secondDeferred = createDeferred<ReadableStream>();
      const firstStream = new ReadableStream();
      const secondStream = new ReadableStream();
      const firstBlob = new Blob(['first']);
      const secondBlob = new Blob(['second']);
      mockedDownloadFile.mockReturnValueOnce(firstDeferred.promise).mockReturnValueOnce(secondDeferred.promise);
      mockedBinaryStreamToBlob.mockImplementation(async (stream) => (stream === firstStream ? firstBlob : secondBlob));
      const secondItem = createFileItem({ uuid: 'second-file-uuid', fileId: 'second-network-file-id' });

      const { result } = renderDownloadHook();
      act(() => {
        result.current.openPreview(createFileItem());
      });
      act(() => {
        result.current.openPreview(secondItem);
      });
      await act(async () => {
        secondDeferred.resolve(secondStream);
        firstDeferred.resolve(firstStream);
        await Promise.all([firstDeferred.promise, secondDeferred.promise]);
      });

      await waitFor(() => {
        expect(result.current.previewBlob).toBe(secondBlob);
      });
      expect(result.current.previewItem).toBe(secondItem);
    });

    test('When a stale download reports progress, then the progress of the current preview is kept', async () => {
      const deferred = createDeferred<ReadableStream>();
      mockedDownloadFile.mockReturnValue(deferred.promise);

      const { result } = renderDownloadHook();
      act(() => {
        result.current.openPreview(createFileItem());
      });
      const staleNotifyProgress = mockedDownloadFile.mock.calls[0][0].options?.notifyProgress;
      act(() => {
        result.current.closePreview();
      });
      act(() => {
        staleNotifyProgress?.(100, 50);
      });

      expect(result.current.previewProgress).toBe(0);
    });

    test('When the download of the current preview fails, then the preview is closed and an error is shown', async () => {
      mockedDownloadFile.mockRejectedValue(new Error('download failed'));

      const { result } = renderDownloadHook();
      act(() => {
        result.current.openPreview(createFileItem());
      });

      await waitFor(() => {
        expect(result.current.previewItem).toBeNull();
      });
      expect(notificationsService.show).toHaveBeenCalledWith({ text: 'download failed', type: 'error' });
    });

    test('When the item is a folder or there are no credentials, then no preview is opened', () => {
      const { result: withoutCredentials } = renderDownloadHook({ withCredentials: false });
      act(() => {
        withoutCredentials.current.openPreview(createFileItem());
      });

      const { result } = renderDownloadHook();
      act(() => {
        result.current.openPreview(createFileItem({ isFolder: true }));
      });

      expect(withoutCredentials.current.previewItem).toBeNull();
      expect(result.current.previewItem).toBeNull();
      expect(mockedDownloadFile).not.toHaveBeenCalled();
    });
  });

  describe('downloadItems', () => {
    test('When items are downloaded, then isDownloading is active until the download finishes', async () => {
      const deferred = createDeferred<void>();
      mockedDownloadPublicSharedItems.mockReturnValue(deferred.promise);

      const { result } = renderDownloadHook();
      act(() => {
        result.current.downloadItems([createFileItem()]);
      });

      expect(result.current.isDownloading).toBe(true);
      await act(async () => {
        deferred.resolve();
        await deferred.promise;
      });
      expect(result.current.isDownloading).toBe(false);
    });

    test('When the download fails, then an error notification is shown and isDownloading is reset', async () => {
      mockedDownloadPublicSharedItems.mockRejectedValue(new Error('zip failed'));

      const { result } = renderDownloadHook();
      act(() => {
        result.current.downloadItems([createFileItem()]);
      });

      await waitFor(() => {
        expect(result.current.isDownloading).toBe(false);
      });
      expect(notificationsService.show).toHaveBeenCalledWith({ text: 'zip failed', type: 'error' });
    });

    test('When there are no items or no credentials, then no download is started', () => {
      const { result } = renderDownloadHook();
      act(() => {
        result.current.downloadItems([]);
      });

      const { result: withoutCredentials } = renderDownloadHook({ withCredentials: false });
      act(() => {
        withoutCredentials.current.downloadItems([createFileItem()]);
      });

      expect(mockedDownloadPublicSharedItems).not.toHaveBeenCalled();
    });
  });
});
