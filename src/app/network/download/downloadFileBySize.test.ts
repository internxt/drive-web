import { beforeEach, describe, expect, test, vi } from 'vitest';
import { downloadFile, multipartDownloadFile } from 'app/network/download';
import { MIN_DOWNLOAD_MULTIPART_SIZE } from 'app/network/networkConstants';
import { downloadFileBySize } from './downloadFileBySize';

vi.mock('app/network/download', () => ({
  downloadFile: vi.fn(),
  multipartDownloadFile: vi.fn(),
}));

const params = {
  bucketId: 'bucket-id',
  fileId: 'file-id',
  creds: { user: 'network-user', pass: 'network-pass' },
  key: { bucketKey: Buffer.from('bucket-key') },
};

describe('Downloading a file by its size', () => {
  const downloadedStream = new ReadableStream<Uint8Array>();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(downloadFile).mockResolvedValue(downloadedStream);
    vi.mocked(multipartDownloadFile).mockResolvedValue(downloadedStream);
  });

  const expectSingleRequest = async (fileSize: number) => {
    const stream = await downloadFileBySize({ ...params, fileSize });

    expect(stream).toBe(downloadedStream);
    expect(downloadFile).toHaveBeenCalledWith(params);
    expect(multipartDownloadFile).not.toHaveBeenCalled();
  };

  test('when a file is just below the multipart size, then it is downloaded in a single request', async () => {
    await expectSingleRequest(MIN_DOWNLOAD_MULTIPART_SIZE - 1);
  });

  test('when a file is exactly the multipart size, then it is downloaded in chunks with its size', async () => {
    const fileSize = MIN_DOWNLOAD_MULTIPART_SIZE;

    const stream = await downloadFileBySize({ ...params, fileSize });

    expect(stream).toBe(downloadedStream);
    expect(multipartDownloadFile).toHaveBeenCalledWith({ ...params, fileSize });
    expect(downloadFile).not.toHaveBeenCalled();
  });

  test('when a file has no known size, then it is downloaded in a single request', async () => {
    await expectSingleRequest(Number.NaN);
  });
});
