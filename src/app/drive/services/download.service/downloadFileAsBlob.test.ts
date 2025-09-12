import { describe, expect, vi, beforeEach, test } from 'vitest';
import { downloadFileAsBlob, getBlobWritable } from './downloadFileAsBlob';
import downloadFileFromBlob from './downloadFileFromBlob';

vi.mock('./downloadFileFromBlob', () => ({
  default: vi.fn(),
}));

function createStream(chunks: (Uint8Array | string)[]) {
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(chunk);
      }
      controller.close();
    },
  });
}

describe('downloadFileAsBlob', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('When a blob is created, then it should be created and downloaded with the correct name and content', async () => {
    const chunks = [new TextEncoder().encode('Hello '), new TextEncoder().encode('World')];
    const stream = createStream(chunks);
    const filename = 'test.txt';

    const blobWritable = await getBlobWritable(filename, (blob) => {
      downloadFileFromBlob(blob, filename);
    });

    await downloadFileAsBlob(stream, blobWritable);

    expect(downloadFileFromBlob).toHaveBeenCalledTimes(1);

    const [blob, calledFilename] = (downloadFileFromBlob as any).mock.calls[0];
    const text = await (blob as Blob).text();

    expect(calledFilename).toBe(filename);
    expect(text).toBe('Hello World');
  });

  test('When a big file is created, then it should handle large chunk writes', async () => {
    const chunk = new Uint8Array(1024 * 1024).fill(97);
    const streamSize = chunk.length * 2;
    const stream = createStream([chunk, chunk]);
    const filename = 'big.txt';

    const blobWritable = await getBlobWritable(filename, (blob) => {
      downloadFileFromBlob(blob, filename);
    });

    await downloadFileAsBlob(stream, blobWritable);

    expect(downloadFileFromBlob).toHaveBeenCalledTimes(1);
    const [blob] = (downloadFileFromBlob as any).mock.calls[0];
    expect(blob.size).toBe(streamSize);
  });
});
