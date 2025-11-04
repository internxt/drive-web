import { describe, test, expect, beforeEach, vi, afterEach } from 'vitest';
import { StreamSaver } from './streamSaver';

const mockedChunk = new Uint8Array([1, 2, 3]);

describe('Stream Saver Service', () => {
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
      test('When creating write stream, then it should send readable stream via postMessage', async () => {
        streamSaver.createWriteStream('test.txt');
        await new Promise((resolve) => setTimeout(resolve, 10));

        expect(mockMessageChannel.port1.postMessage).toHaveBeenCalledWith(
          { readableStream: mockTransformStream.readable },
          [mockTransformStream.readable],
        );
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
