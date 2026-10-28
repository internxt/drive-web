import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import downloadService from 'app/drive/services/download.service';
import { PreviewFileItem } from 'app/share/types';
import errorService from 'services/error.service';
import { useFilePreviewContent } from './useFilePreviewContent';

type CachedFile = { fileId: number; sourceBlob: Blob; updatedAt: string };

const { cachedFiles } = vi.hoisted(() => ({ cachedFiles: new Map<number, { source: Blob; updatedAt: string }>() }));

const CACHE_SIZE_LIMIT = 50 * 1024 * 1024;

vi.mock('app/drive/services/database.service', () => ({
  canFileBeCached: (file: PreviewFileItem) => file.size < CACHE_SIZE_LIMIT,
  getDatabaseFileSourceData: async ({ fileId }: { fileId: number }) => cachedFiles.get(fileId),
  updateDatabaseFileSourceData: async ({ fileId, sourceBlob, updatedAt }: CachedFile) => {
    cachedFiles.set(fileId, { source: sourceBlob, updatedAt });
  },
}));
vi.mock('app/drive/services/download.service', () => ({ default: { fetchFileBlob: vi.fn() } }));
vi.mock('services/error.service', () => ({ default: { reportError: vi.fn() } }));

const UPDATED_AT = '2026-01-02T00:00:00.000Z';
const OLDER_DATE = '2026-01-01T00:00:00.000Z';

type PendingDownload = {
  fileId: number;
  signal: AbortSignal;
  reportProgress: (progress: number) => void;
  finish: (blob: Blob) => void;
  fail: (error: Error) => void;
};

let downloads: PendingDownload[] = [];

const createFile = (overrides: Partial<PreviewFileItem> = {}): PreviewFileItem =>
  ({
    id: 1,
    fileId: 'network-file',
    bucket: 'bucket',
    type: 'txt',
    size: 1024,
    updatedAt: UPDATED_AT,
    ...overrides,
  }) as PreviewFileItem;

const contentOf = (text: string) => new Blob([text]);

const renderPreview = (file: PreviewFileItem, onFreshDownload = vi.fn()) =>
  renderHook(
    ({ previewFile, isEnabled }) =>
      useFilePreviewContent({ file: previewFile, isEnabled, isWorkspace: false, onFreshDownload }),
    { initialProps: { previewFile: file, isEnabled: true } },
  );

const waitForDownload = async (fileId: number): Promise<PendingDownload> => {
  await waitFor(() => expect(downloads.some((download) => download.fileId === fileId)).toBe(true));
  return downloads.find((download) => download.fileId === fileId) as PendingDownload;
};

describe('Loading the content of a file preview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cachedFiles.clear();
    downloads = [];
    vi.mocked(downloadService.fetchFileBlob).mockImplementation(
      (item, options) =>
        new Promise((finish, fail) => {
          const { id: fileId } = item as unknown as PreviewFileItem;
          const signal = options.abortController?.signal as AbortSignal;
          downloads.push({ fileId, signal, reportProgress: options.updateProgressCallback, finish, fail });
        }),
    );
  });

  test('When a file is opened, then its download progress is shown and then its content', async () => {
    const content = contentOf('hello');
    const { result } = renderPreview(createFile());

    const download = await waitForDownload(1);
    act(() => download.reportProgress(0.4));
    expect(result.current).toMatchObject({ progress: 0.4, blob: null });

    await act(async () => download.finish(content));
    expect(result.current).toMatchObject({ progress: 0, blob: content, hasFailed: false });
  });

  test('When the file is cached and up to date, then it is shown without downloading it again', async () => {
    const cachedContent = contentOf('cached');
    cachedFiles.set(1, { source: cachedContent, updatedAt: UPDATED_AT });
    const onFreshDownload = vi.fn();

    const { result } = renderPreview(createFile(), onFreshDownload);

    await waitFor(() => expect(result.current.blob).toBe(cachedContent));
    expect(downloadService.fetchFileBlob).not.toHaveBeenCalled();
    expect(onFreshDownload).not.toHaveBeenCalled();
  });

  test('When the cached copy is older than the file, then it is downloaded again and the cache is refreshed', async () => {
    cachedFiles.set(1, { source: contentOf('old'), updatedAt: OLDER_DATE });
    const newContent = contentOf('new');
    const { result } = renderPreview(createFile());

    const download = await waitForDownload(1);
    await act(async () => download.finish(newContent));

    expect(result.current.blob).toBe(newContent);
    expect(cachedFiles.get(1)).toStrictEqual({ source: newContent, updatedAt: UPDATED_AT });
  });

  test.each([
    { case: 'small enough, then it is kept in the cache', size: 1024, isCached: true },
    { case: 'too big for the cache, then it is not kept in the cache', size: CACHE_SIZE_LIMIT + 1, isCached: false },
  ])('When a downloaded file is $case and the caller can refresh its thumbnail', async ({ size, isCached }) => {
    const content = contentOf('hello');
    const file = createFile({ size });
    const onFreshDownload = vi.fn();
    const { result } = renderPreview(file, onFreshDownload);

    const download = await waitForDownload(1);
    await act(async () => download.finish(content));

    expect(result.current.blob).toBe(content);
    expect(cachedFiles.has(1)).toBe(isCached);
    expect(onFreshDownload).toHaveBeenCalledWith(file, content);
  });

  test('When the user moves to another file before the first one finishes, then only the new file content and progress are shown', async () => {
    const { result, rerender } = renderPreview(createFile({ id: 1 }));
    const firstDownload = await waitForDownload(1);

    rerender({ previewFile: createFile({ id: 2 }), isEnabled: true });
    const secondDownload = await waitForDownload(2);
    act(() => firstDownload.reportProgress(0.9));
    await act(async () => firstDownload.finish(contentOf('first')));
    expect(result.current).toMatchObject({ progress: 0, blob: null });

    const secondContent = contentOf('second');
    await act(async () => secondDownload.finish(secondContent));
    expect(result.current.blob).toBe(secondContent);
  });

  test('When the viewer is closed while downloading, then the download is cancelled without reporting an error', async () => {
    const { result, rerender } = renderPreview(createFile());
    const download = await waitForDownload(1);

    rerender({ previewFile: createFile(), isEnabled: false });
    await act(async () => download.fail(Object.assign(new Error('aborted'), { name: 'AbortError' })));

    expect(download.signal.aborted).toBe(true);
    expect(result.current.hasFailed).toBe(false);
    expect(errorService.reportError).not.toHaveBeenCalled();
  });

  test('When the download fails, then the preview is marked as failed and the error is reported', async () => {
    const error = new Error('network down');
    const { result } = renderPreview(createFile());

    const download = await waitForDownload(1);
    await act(async () => download.fail(error));

    expect(result.current).toMatchObject({ hasFailed: true, blob: null });
    expect(errorService.reportError).toHaveBeenCalledWith(error);
  });

  test('When the file is renamed while it is open, then its content is not downloaded again', async () => {
    const file = createFile();
    const content = contentOf('hello');
    const { result, rerender } = renderPreview(file);
    const download = await waitForDownload(1);
    await act(async () => download.finish(content));

    rerender({ previewFile: { ...file, name: 'renamed', plainName: 'renamed' }, isEnabled: true });

    expect(result.current.blob).toBe(content);
    expect(downloadService.fetchFileBlob).toHaveBeenCalledTimes(1);
  });

  test.each([
    { case: 'empty, then an empty content is shown', file: createFile({ size: 0 }), shownSize: 0 },
    { case: 'a video, then it is streamed instead', file: createFile({ type: 'mp4' }), shownSize: undefined },
    { case: 'a type with no preview, then nothing is shown', file: createFile({ type: 'zip' }), shownSize: undefined },
    { case: 'too large to preview, then nothing is shown', file: createFile({ size: 2 ** 30 }), shownSize: undefined },
  ])('When the file is $case without downloading it', async ({ file, shownSize }) => {
    const { result } = renderPreview(file);

    await act(async () => {});

    expect(result.current.blob?.size).toBe(shownSize);
    expect(downloadService.fetchFileBlob).not.toHaveBeenCalled();
  });

  test('When an image that needs converting is downloading, then the progress stops short of complete', async () => {
    const { result } = renderPreview(createFile({ type: 'heic' }));

    const download = await waitForDownload(1);
    act(() => download.reportProgress(1));

    expect(result.current.progress).toBe(0.95);
  });
});
