import { describe, test, expect, beforeEach, vi, afterEach } from 'vitest';
import { STREAM_SAVER_MITM, StreamSaver } from './StreamSaver';
import { InvalidChunkError } from './errors/streamSaver.errors';

const mockedChunk = new Uint8Array([1, 2, 3]);

describe('Stream Saver Service', () => {
  describe('Without transferable support', () => {
    let streamSaver: StreamSaver;
    let mockIframe: HTMLIFrameElement;
    let mockMessageChannel: MessageChannel;
    let originalAppendChild: typeof document.body.appendChild;

    beforeEach(() => {
      streamSaver = new StreamSaver();

      (streamSaver as any).supportsTransferable = false;

      mockMessageChannel = {
        port1: {
          postMessage: vi.fn(),
          onmessage: null,
          close: vi.fn(),
        } as any,
        port2: {} as any,
      };

      global.MessageChannel = vi.fn(() => mockMessageChannel) as any;

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

    describe('Aborting stream', () => {
      test('When aborting stream, then it should post abort message and close ports', async () => {
        mockMessageChannel.port2.close = vi.fn();
        const stream = streamSaver.createWriteStream('test.txt');
        const writer = stream.getWriter();
        await new Promise((resolve) => setTimeout(resolve, 10));
        vi.clearAllMocks();

        await writer.abort();

        expect(mockMessageChannel.port1.postMessage).toHaveBeenCalledWith('abort');
        expect(mockMessageChannel.port1.close).toHaveBeenCalled();
        expect(mockMessageChannel.port2.close).toHaveBeenCalled();
      });

      test('When aborting after writing chunks, then it should abort immediately', async () => {
        mockMessageChannel.port2.close = vi.fn();
        const stream = streamSaver.createWriteStream('test.txt');
        const writer = stream.getWriter();
        const chunk = new Uint8Array([1, 2, 3]);
        await new Promise((resolve) => setTimeout(resolve, 10));
        await writer.write(chunk);
        vi.clearAllMocks();

        await writer.abort();

        expect(mockMessageChannel.port1.postMessage).toHaveBeenCalledWith('abort');
        expect(mockMessageChannel.port1.close).toHaveBeenCalled();
        expect(mockMessageChannel.port2.close).toHaveBeenCalled();
      });

      test('When aborting, then onmessage handler should be cleared', async () => {
        mockMessageChannel.port2.close = vi.fn();
        const stream = streamSaver.createWriteStream('test.txt');
        const writer = stream.getWriter();
        await new Promise((resolve) => setTimeout(resolve, 10));
        mockMessageChannel.port1.onmessage = vi.fn();

        await writer.abort();

        expect(mockMessageChannel.port1.onmessage).toBeNull();
      });
    });
  });

  describe('With transferable support', () => {
    let streamSaver: StreamSaver;
    let mockIframe: HTMLIFrameElement;
    let mockMessageChannel: MessageChannel;
    let mockTransformStream: TransformStream;
    let mockWriter;
    let originalAppendChild: typeof document.body.appendChild;

    beforeEach(() => {
      streamSaver = new StreamSaver();

      (streamSaver as any).supportsTransferable = true;

      mockWriter = {
        write: vi.fn().mockResolvedValue(undefined),
        close: vi.fn().mockResolvedValue(undefined),
        abort: vi.fn().mockResolvedValue(undefined),
        releaseLock: vi.fn(),
      };

      mockTransformStream = {
        readable: new ReadableStream(),
        writable: {
          getWriter: vi.fn(() => mockWriter),
        } as any,
      } as any;

      global.TransformStream = vi.fn(() => mockTransformStream) as any;

      mockMessageChannel = {
        port1: {
          postMessage: vi.fn(),
          onmessage: null,
          close: vi.fn(),
        } as any,
        port2: {
          close: vi.fn(),
        } as any,
      };

      global.MessageChannel = vi.fn(() => mockMessageChannel) as any;

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
      test('When creating write stream, then it should create a TransformStream', () => {
        streamSaver.createWriteStream('test.txt');
        expect(TransformStream).toHaveBeenCalledOnce();
      });

      test('When creating write stream, then it should send readable stream via postMessage', async () => {
        streamSaver.createWriteStream('test.txt');
        await new Promise((resolve) => setTimeout(resolve, 10));

        expect(mockMessageChannel.port1.postMessage).toHaveBeenCalledWith(
          { readableStream: mockTransformStream.readable },
          [mockTransformStream.readable],
        );
      });

      test('When creating write stream, then it should return the writable side', () => {
        const stream = streamSaver.createWriteStream('test.txt');
        expect(stream).toBe(mockTransformStream.writable);
      });
    });

    describe('Writing to stream', () => {
      test('When writing a chunk, then it should use TransformStream writable', async () => {
        const stream = streamSaver.createWriteStream('test.txt');
        const writer = stream.getWriter();

        await writer.write(mockedChunk);

        expect(mockWriter.write).toHaveBeenCalledWith(mockedChunk);
      });
    });

    describe('Closing stream', () => {
      test('When closing stream, then it should close the TransformStream writable', async () => {
        const stream = streamSaver.createWriteStream('test.txt');
        const writer = stream.getWriter();

        await writer.close();

        expect(mockWriter.close).toHaveBeenCalled();
      });
    });

    describe('Aborting stream', () => {
      test('When aborting stream, then it should abort the TransformStream writable', async () => {
        const stream = streamSaver.createWriteStream('test.txt');
        const writer = stream.getWriter();

        await writer.abort();

        expect(mockWriter.abort).toHaveBeenCalled();
      });
    });
  });
});
