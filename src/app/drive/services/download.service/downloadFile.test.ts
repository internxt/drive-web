import { describe, it, expect, vi } from 'vitest';
import { ErrorMessages } from 'app/core/constants';

function buildReadable() {
  const cancel = vi.fn().mockResolvedValue(undefined);
  const read = vi.fn().mockResolvedValue({ done: false, value: new Uint8Array([1, 2, 3]) });

  return {
    getReader: vi.fn().mockReturnValue({ read, cancel, closed: Promise.resolve() }),
    __reader__: { read, cancel },
  };
}

async function loadSut() {
  vi.resetModules();
  vi.clearAllMocks();

  vi.doMock('react-device-detect', () => ({ isFirefox: true }));

  const downloadFileFromBlob = vi.fn();
  vi.doMock('./downloadFileFromBlob', () => ({ default: downloadFileFromBlob }));

  const readable = buildReadable();
  const fetchFileStream = vi.fn().mockResolvedValue(readable);
  vi.doMock('./fetchFileStream', () => ({ default: fetchFileStream }));

  Object.defineProperty(window, 'showSaveFilePicker', {
    value: undefined,
    writable: true,
    configurable: true,
  });

  const mod = await import('./downloadFile');
  const downloadFile = mod.default;

  const abortController = new AbortController();
  abortController.abort();

  return { downloadFile, abortController, readable };
}

const testFileData: import('../../types').DriveFileData = {
  id: 1,
  bucket: 'test-bucket',
  name: 'test-file',
  plainName: 'test-file',
  type: 'txt',
  size: 1024,
  status: 'ready',
  uuid: 'test-uuid',
  fileId: 'test-file-id',
  folderId: 1,
  folder_id: 1,
  folderUuid: 'test-folder-uuid',
  encrypt_version: '1.0',
  createdAt: '2023-01-01T00:00:00Z',
  created_at: '2023-01-01T00:00:00Z',
  updatedAt: '2023-01-01T00:00:00Z',
  deleted: false,
  deletedAt: null,
  thumbnails: [],
  currentThumbnail: null,
  plain_name: 'test-file',
};

describe('downloadFile abort behavior', () => {
  it('aborts download and calls reader.cancel() when AbortController is aborted', async () => {
    const { downloadFile, abortController, readable } = await loadSut();

    await expect(downloadFile(testFileData, false, vi.fn(), abortController)).rejects.toThrow(
      ErrorMessages.DownloadCancelled,
    );
    expect(readable.__reader__.cancel).toHaveBeenCalled();
  });
});
