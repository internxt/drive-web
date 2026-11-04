import { beforeEach, describe, expect, test, vi } from 'vitest';
import streamSaver from '../../../../libs/streamSaver';
import { DownloadSupport, downloadToFs } from './downloadFile';

vi.mock('../../../../libs/streamSaver', () => ({
  default: { createWriteStream: vi.fn() },
}));

const FILE_NAME = 'report.pdf';

const saveToDownloads = (size?: number) =>
  downloadToFs(
    FILE_NAME,
    Promise.resolve(new ReadableStream<Uint8Array>({ start: (controller) => controller.close() })),
    DownloadSupport.PartialStreamApi,
    false,
    undefined,
    size,
  );

describe('Download to file system', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(streamSaver.createWriteStream).mockImplementation(() => new WritableStream<Uint8Array>());
  });

  test('when the file size is given, then the download announces it to the browser', async () => {
    await saveToDownloads(2048);

    expect(streamSaver.createWriteStream).toHaveBeenCalledWith(FILE_NAME, { size: 2048 });
  });

  test('when the file size is not given, then the download does not announce any size', async () => {
    await saveToDownloads();

    expect(vi.mocked(streamSaver.createWriteStream).mock.calls[0][1]?.size).toBeUndefined();
  });
});
