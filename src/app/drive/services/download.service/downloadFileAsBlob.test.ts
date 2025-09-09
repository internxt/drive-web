import { describe, expect, vi, beforeEach, test } from 'vitest';
import { downloadFileAsBlob } from './downloadFileAsBlob';
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

  test('When a blob is created, then it should be created and downloaded with the correcta name and content', async () => {
    const chunks = [new TextEncoder().encode('Hello '), new TextEncoder().encode('World')];
    const stream = createStream(chunks);

    await downloadFileAsBlob('test.txt', stream);

    const [blob, filename] = (downloadFileFromBlob as any).mock.calls[0];
    const text = await (blob as Blob).text();

    expect(downloadFileFromBlob).toHaveBeenCalledTimes(1);
    expect(filename).toBe('test.txt');
    expect(text).toBe('Hello World');
  });

  test('When a big file is created, then it should handle large chunk writes', async () => {
    const chunk = new Uint8Array(1024 * 1024).fill(97);
    const stream = createStream([chunk, chunk]);

    await downloadFileAsBlob('big.txt', stream);

    const [blob] = (downloadFileFromBlob as any).mock.calls[0];

    expect(downloadFileFromBlob).toHaveBeenCalledTimes(1);
    expect(blob.size).toBe(2 * 1024 * 1024);
  });
});
