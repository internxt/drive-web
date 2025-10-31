import { describe, test, expect, beforeEach, vi, afterEach } from 'vitest';
import { STREAM_SAVER_MITM, StreamSaver } from './streamSaver';
import { InvalidChunkError } from './errors/streamSaver.errors';

const mockedChunk = new Uint8Array([1, 2, 3]);

describe('Stream Saver Service', () => {
  let streamSaver: StreamSaver;
  let mockIframe: HTMLIFrameElement;
  let mockMessageChannel: MessageChannel;
  let originalAppendChild: typeof document.body.appendChild;

  beforeEach(() => {
    streamSaver = new StreamSaver();

    // Mock MessageChannel
    mockMessageChannel = {
      port1: {
        postMessage: vi.fn(),
        onmessage: null,
        close: vi.fn(),
      } as any,
      port2: {} as any,
    };

    global.MessageChannel = vi.fn(() => mockMessageChannel) as any;

    // Mock iframe creation
    originalAppendChild = document.body.appendChild;
    document.body.appendChild = vi.fn((element) => {
      if (element instanceof HTMLIFrameElement) {
        mockIframe = element;
        setTimeout(() => {
          const loadEvent = new Event('load');
          element.dispatchEvent(loadEvent);
        }, 0);
      }
      return element;
    }) as any;
  });

  afterEach(() => {
    document.body.appendChild = originalAppendChild;
    vi.clearAllMocks();
  });

  describe('Write Stream', () => {
    test('When creating write stream, then it should return it correctly', () => {
      const stream = streamSaver.createWriteStream('test.txt');
      expect(stream).toBeInstanceOf(WritableStream);
    });

    test('When creating write stream, then it should create a message channel', () => {
      streamSaver.createWriteStream('test.txt');
      expect(MessageChannel).toHaveBeenCalledOnce();
    });

    test('When creating write stream, then it should load transporter iframe', async () => {
      streamSaver.createWriteStream('test.txt');

      expect(document.body.appendChild).toHaveBeenCalled();
      expect(mockIframe).toBeDefined();
      expect(mockIframe.src).toContain(STREAM_SAVER_MITM);
      expect(mockIframe.hidden).toBe(true);
    });

    test('When creating multiple streams, then it should reuse the same transporter', async () => {
      streamSaver.createWriteStream('file1.txt');

      const oldAppend = (document.body.appendChild as any).mock.calls.length;
      streamSaver.createWriteStream('file2.txt');
      const newAppend = (document.body.appendChild as any).mock.calls.length;

      expect(newAppend).toBe(oldAppend);
    });
  });

  describe('Writing to stream', () => {
    test('When writing a chunk, then it should post message with chunk', async () => {
      const stream = streamSaver.createWriteStream('test.txt');
      const writer = stream.getWriter();

      await writer.write(mockedChunk);

      expect(mockMessageChannel.port1.postMessage).toHaveBeenCalledWith(mockedChunk);
    });

    test('When writing the chunk with invalid data, then an error indicating so isThrown', async () => {
      const stream = streamSaver.createWriteStream('test.txt');
      const writer = stream.getWriter();
      const invalidData = 'invalid' as any;

      await expect(writer.write(invalidData)).rejects.toThrow(InvalidChunkError);
    });

    test('When writing multiple chunks, then all should be posted in order', async () => {
      const chunks = Array.from({ length: 3 }, () => mockedChunk);
      const stream = streamSaver.createWriteStream('test.txt');
      const writer = stream.getWriter();

      for (const chunk of chunks) {
        await writer.write(chunk);
      }

      expect(mockMessageChannel.port1.postMessage).toHaveBeenCalledTimes(chunks.length);
      chunks.forEach((chunk, index) => {
        expect(mockMessageChannel.port1.postMessage).toHaveBeenNthCalledWith(index + 1, chunk);
      });
    });
  });

  describe('Closing stream', () => {
    test('When closing stream, then it should post end message', async () => {
      const stream = streamSaver.createWriteStream('test.txt');
      const writer = stream.getWriter();

      await writer.close();

      expect(mockMessageChannel.port1.postMessage).toHaveBeenCalledWith('end');
    });

    test('When closing after writing chunks, then end message should be last', async () => {
      const stream = streamSaver.createWriteStream('test.txt');
      const writer = stream.getWriter();
      const chunk = new Uint8Array([1, 2, 3]);

      await new Promise((resolve) => setTimeout(resolve, 10));
      vi.clearAllMocks();

      await writer.write(chunk);
      await writer.close();

      expect(mockMessageChannel.port1.postMessage).toHaveBeenCalledTimes(2);
      expect(mockMessageChannel.port1.postMessage).toHaveBeenNthCalledWith(1, chunk);
      expect(mockMessageChannel.port1.postMessage).toHaveBeenNthCalledWith(2, 'end');
    });
  });

  // describe('Aborting stream', () => {
  //   test('When aborting stream, then it should post abort message and close ports', async () => {
  //     const stream = streamSaver.createWriteStream('test.txt');
  //     const writer = stream.getWriter();

  //     await new Promise((resolve) => setTimeout(resolve, 10));
  //     vi.clearAllMocks();

  //     await writer.abort();

  //     expect(mockMessageChannel.port1.postMessage).toHaveBeenCalledWith('abort');
  //     expect(mockMessageChannel.port1.close).toHaveBeenCalled();
  //   });

  //   test('When aborting after writing chunks, then it should abort immediately', async () => {
  //     const stream = streamSaver.createWriteStream('test.txt');
  //     const writer = stream.getWriter();
  //     const chunk = new Uint8Array([1, 2, 3]);

  //     await new Promise((resolve) => setTimeout(resolve, 10));

  //     await writer.write(chunk);
  //     vi.clearAllMocks();

  //     await writer.abort();

  //     expect(mockMessageChannel.port1.postMessage).toHaveBeenCalledWith('abort');
  //     expect(mockMessageChannel.port1.close).toHaveBeenCalled();
  //   });

  //   test('When aborting, then onmessage handler should be cleared', async () => {
  //     const stream = streamSaver.createWriteStream('test.txt');
  //     const writer = stream.getWriter();

  //     await new Promise((resolve) => setTimeout(resolve, 10));

  //     mockMessageChannel.port1.onmessage = vi.fn();

  //     await writer.abort();

  //     expect(mockMessageChannel.port1.onmessage).toBeNull();
  //   });
  // });

  // describe('Service Worker messages', () => {
  //   test('When receiving download message, then it should create download iframe', async () => {
  //     const stream = streamSaver.createWriteStream('test.txt');
  //     await new Promise((resolve) => setTimeout(resolve, 10));

  //     const downloadUrl = 'blob:http://localhost/abc123';
  //     const appendCallsBefore = (document.body.appendChild as any).mock.calls.length;

  //     mockMessageChannel.port1.onmessage?.({
  //       data: { download: downloadUrl },
  //     } as MessageEvent);

  //     await new Promise((resolve) => setTimeout(resolve, 10));

  //     const appendCallsAfter = (document.body.appendChild as any).mock.calls.length;
  //     expect(appendCallsAfter).toBeGreaterThan(appendCallsBefore);
  //   });

  //   test('When receiving abort message, then it should cleanup channel', async () => {
  //     const stream = streamSaver.createWriteStream('test.txt');
  //     await new Promise((resolve) => setTimeout(resolve, 10));

  //     vi.clearAllMocks();

  //     mockMessageChannel.port1.onmessage?.({
  //       data: { abort: true },
  //     } as MessageEvent);

  //     expect(mockMessageChannel.port1.postMessage).toHaveBeenCalledWith('abort');
  //     expect(mockMessageChannel.port1.close).toHaveBeenCalled();
  //   });
  // });

  // describe('Complete download flow', () => {
  //   test('When downloading complete file, then all operations should execute correctly', async () => {
  //     const filename = 'complete-file.txt';
  //     const chunks = [new Uint8Array([1, 2, 3]), new Uint8Array([4, 5, 6]), new Uint8Array([7, 8, 9])];

  //     const stream = streamSaver.createWriteStream(filename, { size: 9 });
  //     const writer = stream.getWriter();

  //     await new Promise((resolve) => setTimeout(resolve, 10));
  //     vi.clearAllMocks();

  //     for (const chunk of chunks) {
  //       await writer.write(chunk);
  //     }
  //     await writer.close();

  //     expect(mockMessageChannel.port1.postMessage).toHaveBeenCalledTimes(chunks.length + 1);
  //     chunks.forEach((chunk, index) => {
  //       expect(mockMessageChannel.port1.postMessage).toHaveBeenNthCalledWith(index + 1, chunk);
  //     });
  //     expect(mockMessageChannel.port1.postMessage).toHaveBeenLastCalledWith('end');
  //   });
  // });

  // describe('Edge cases', () => {
  //   test('When creating stream with empty filename, then it should handle gracefully', async () => {
  //     const stream = streamSaver.createWriteStream('');
  //     expect(stream).toBeInstanceOf(WritableStream);
  //   });

  //   test('When creating stream with very long filename, then it should encode properly', async () => {
  //     const longFilename = 'a'.repeat(300) + '.txt';
  //     const stream = streamSaver.createWriteStream(longFilename);
  //     expect(stream).toBeInstanceOf(WritableStream);
  //   });

  //   test('When creating stream with unicode characters, then it should encode properly', async () => {
  //     const unicodeFilename = '文件名-файл-αρχείο.txt';
  //     const stream = streamSaver.createWriteStream(unicodeFilename);
  //     expect(stream).toBeInstanceOf(WritableStream);
  //   });
  // });
});
