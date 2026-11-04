import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { getDriveItemData } from 'testUtils/fixtures/drive.fixtures';
import { DriveItemData } from 'app/drive/types';
import streamSaver from '../../../../libs/streamSaver';
import downloadFile, { DownloadSupport, downloadToFs } from './downloadFile';
import fetchFileStream from './fetchFileStream';

vi.mock('../../../../libs/streamSaver', () => ({
  default: { createWriteStream: vi.fn() },
}));

vi.mock('./fetchFileStream', () => ({
  default: vi.fn(),
}));

const FILE_NAME = 'report.pdf';
const FILE_SIZE = 2048;

const createEmptyStream = () => new ReadableStream<Uint8Array>({ start: (controller) => controller.close() });

const removeSaveFilePicker = () => {
  vi.stubGlobal('showSaveFilePicker', undefined);
  Reflect.deleteProperty(globalThis, 'showSaveFilePicker');
};

const downloadItem = (overrides: Partial<DriveItemData>) =>
  downloadFile(getDriveItemData({ plainName: 'report', ...overrides }), false, vi.fn());

describe('Download file', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    removeSaveFilePicker();
    vi.mocked(fetchFileStream).mockResolvedValue(createEmptyStream());
    vi.mocked(streamSaver.createWriteStream).mockImplementation(() => new WritableStream<Uint8Array>());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test('when the file size is given, then the download announces it to the browser', async () => {
    await downloadToFs(
      FILE_NAME,
      Promise.resolve(createEmptyStream()),
      DownloadSupport.PartialStreamApi,
      false,
      undefined,
      FILE_SIZE,
    );

    expect(streamSaver.createWriteStream).toHaveBeenCalledWith(FILE_NAME, { size: FILE_SIZE });
  });

  test.each<[string, Partial<DriveItemData>, string]>([
    ['has an extension', { type: 'pdf' }, 'report.pdf'],
    ['has no extension', { type: '' }, 'report'],
    ['has no plain name', { plainName: null, name: 'invoice', type: 'pdf' }, 'invoice.pdf'],
  ])('when the file %s, then it is saved as %s', async (_description, overrides, expectedName) => {
    await downloadItem(overrides);

    expect(streamSaver.createWriteStream).toHaveBeenCalledWith(expectedName, expect.anything());
  });
});
