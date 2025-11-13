import { describe, test, expect, beforeEach, vi, afterEach } from 'vitest';
import { StreamSaver, STREAM_SAVER_MITM } from '.';

const mockedChunk = new Uint8Array([1, 2, 3]);

describe('Stream Saver Service', () => {
  let streamSaver: StreamSaver;
  let mockIframes: HTMLIFrameElement[] = [];
  let mockMessageChannel: MessageChannel;
  let mockTransformStream: TransformStream;
  let mockWriter;
  let originalAppendChild: typeof document.body.appendChild;

  beforeEach(() => {
    streamSaver = new StreamSaver();
    mockIframes = [];

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
        Object.defineProperty(element, 'contentWindow', {
          value: {
            postMessage: vi.fn(),
          },
          writable: true,
          configurable: true,
        });

        mockIframes.push(element);

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

  test('When transferable streams are supported, then it should create a transform stream and return its writable', () => {
    (streamSaver as any).supportsTransferable = true;

    const stream = streamSaver.createWriteStream('test.txt');

    expect(global.TransformStream).toHaveBeenCalled();
    expect(stream).toBe(mockTransformStream.writable);
  });

  test('When transferable streams are supported, then it should transfer readable stream via post message', async () => {
    (streamSaver as any).supportsTransferable = true;

    streamSaver.createWriteStream('test.txt');

    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(mockMessageChannel.port1.postMessage).toHaveBeenCalledWith(
      { readableStream: mockTransformStream.readable },
      [mockTransformStream.readable],
    );
  });

  test('When transferable streams are not supported, then it should return a pre-created writable stream', () => {
    (streamSaver as any).supportsTransferable = false;

    const stream = streamSaver.createWriteStream('test.txt');

    expect(stream).toBeInstanceOf(WritableStream);
    expect(stream).not.toBe(mockTransformStream.writable);
  });

  test('When transferable streams are not supported and writing a chunk, then it should post message to port 1', async () => {
    (streamSaver as any).supportsTransferable = false;

    const stream = streamSaver.createWriteStream('test.txt');
    const writer = stream.getWriter();

    await writer.write(mockedChunk);

    expect(mockMessageChannel.port1.postMessage).toHaveBeenCalledWith(mockedChunk);
  });

  test('When transferable streams are not supported and closing stream, then it should send an end message', async () => {
    (streamSaver as any).supportsTransferable = false;

    const stream = streamSaver.createWriteStream('test.txt');
    const writer = stream.getWriter();

    await writer.close();

    expect(mockMessageChannel.port1.postMessage).toHaveBeenCalledWith('end');
  });

  test('When creating stream, then it should create MITM iframe', async () => {
    (streamSaver as any).supportsTransferable = true;

    streamSaver.createWriteStream('test.txt');

    await new Promise((resolve) => setTimeout(resolve, 10));

    const mitmIframe = mockIframes[0];
    expect(mitmIframe.src).toContain(STREAM_SAVER_MITM);
    expect(mitmIframe.hidden).toBe(true);
  });

  test('When creating multiple streams, then it should reuse the same MITM iframe', async () => {
    (streamSaver as any).supportsTransferable = true;

    streamSaver.createWriteStream('test1.txt');
    await new Promise((resolve) => setTimeout(resolve, 10));

    streamSaver.createWriteStream('test2.txt');
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(mockIframes.length).toBe(1);
  });

  test('When MITM iframe loads, then it should post message to Service Worker with correct data', async () => {
    (streamSaver as any).supportsTransferable = true;

    streamSaver.createWriteStream('test.txt', { size: 1024 });

    await new Promise((resolve) => setTimeout(resolve, 10));

    const mitmIframe = mockIframes[0];
    const postMessageSpy = mitmIframe.contentWindow?.postMessage as any;

    expect(postMessageSpy).toHaveBeenCalled();

    const [message, targetOrigin, ports] = postMessageSpy.mock.calls[0];
    expect(message.transferringReadable).toBe(true);
    expect(message.headers['Content-Length']).toBe('1024');
    expect(targetOrigin).toBe('*');
    expect(ports[0]).toBe(mockMessageChannel.port2);
  });

  test('When receiving download message from Service Worker, then it should create download iframe', async () => {
    (streamSaver as any).supportsTransferable = true;

    const downloadUrl = 'blob:http://localhost/abc123';

    streamSaver.createWriteStream('test.txt');

    await new Promise((resolve) => setTimeout(resolve, 10));

    mockMessageChannel.port1.onmessage?.({ data: { download: downloadUrl } } as MessageEvent);

    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(mockIframes.length).toBe(2); // MITM + download iframe
    const downloadIframe = mockIframes[1];
    expect(downloadIframe.src).toBe(downloadUrl);
    expect(downloadIframe.hidden).toBe(true);
  });

  test('When receiving abort message from Service Worker, then it should close message channel', async () => {
    (streamSaver as any).supportsTransferable = true;

    streamSaver.createWriteStream('test.txt');

    await new Promise((resolve) => setTimeout(resolve, 10));

    vi.clearAllMocks();

    mockMessageChannel.port1.onmessage?.({ data: { abort: true } } as MessageEvent);

    expect(mockMessageChannel.port1.postMessage).toHaveBeenCalledWith('abort');
    expect(mockMessageChannel.port1.close).toHaveBeenCalled();
    expect(mockMessageChannel.port2.close).toHaveBeenCalled();
  });

  test('When transform receives a non-Uint8Array chunk, then an error indicating so is thrown', () => {
    (streamSaver as any).supportsTransferable = true;

    let capturedTransformFunction: any;

    global.TransformStream = vi.fn((transformer) => {
      capturedTransformFunction = transformer.transform;
      return mockTransformStream;
    }) as any;

    streamSaver.createWriteStream('test.txt');

    const mockController = {
      enqueue: vi.fn(),
    };

    expect(() => {
      capturedTransformFunction('not a uint8array', mockController);
    }).toThrow(TypeError);
    expect(() => {
      capturedTransformFunction('not a uint8array', mockController);
    }).toThrow('Can only write Uint8Arrays');
  });

  test('When transform receives a Uint8Array chunk, then the chunk should be enqueued', () => {
    (streamSaver as any).supportsTransferable = true;

    let capturedTransformFunction: any;

    global.TransformStream = vi.fn((transformer) => {
      capturedTransformFunction = transformer.transform;
      return mockTransformStream;
    }) as any;

    streamSaver.createWriteStream('test.txt');

    const mockController = {
      enqueue: vi.fn(),
    };

    const chunk = new Uint8Array([1, 2, 3, 4, 5]);
    capturedTransformFunction(chunk, mockController);

    expect(mockController.enqueue).toHaveBeenCalledWith(chunk);
  });
});
