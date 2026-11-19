import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import streamSaver from '../../../../libs/streamSaver';
import { DownloadSupport, downloadToFs, getDownloadSupport } from './downloadFile';

vi.mock('../../../../libs/streamSaver', () => ({
  default: { createWriteStream: vi.fn() },
}));

const FILE_NAME = 'report.pdf';
const FILE_SIZE = 2048;

const createEmptyStream = () => new ReadableStream<Uint8Array>({ start: (controller) => controller.close() });

describe('Download file', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(streamSaver.createWriteStream).mockImplementation(() => new WritableStream<Uint8Array>());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test('when the file size is given, then the download announces it to the browser', async () => {
    await downloadToFs({
      filename: FILE_NAME,
      source: Promise.resolve(createEmptyStream()),
      support: DownloadSupport.PartialStreamApi,
      size: FILE_SIZE,
    });

    expect(streamSaver.createWriteStream).toHaveBeenCalledWith(FILE_NAME, { size: FILE_SIZE });
  });

  test('when the browser is Brave, then the file is downloaded as a blob', async () => {
    vi.stubGlobal('navigator', { brave: { isBrave: () => Promise.resolve(true) } });

    const support = await getDownloadSupport();

    expect(support).toBe(DownloadSupport.Blob);
  });
});
