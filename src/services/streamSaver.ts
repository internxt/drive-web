import {
  StreamSaverOptions,
  StreamSaverConfig,
  MitmTransporter,
  ServiceWorkerMessage,
  ServiceWorkerResponse,
} from './types';

// Check if we're in a browser environment
const isBrowser = typeof window !== 'undefined';
const global = isBrowser ? window : ({} as Window);

if (isBrowser && !global.HTMLElement) {
  console.warn('StreamSaver is meant to run on browsers main thread');
}

let mitmTransporter: MitmTransporter | null = null;
let supportsTransferable = false;

const isSecureContext = global.isSecureContext;

// Detect Safari or environments that need blob fallback
// DISABLED: Force Safari to use streams instead of blob fallback
let useBlobFallback = false;
// /constructor/i.test(String(global.HTMLElement)) ||
// !!(global as any).safari ||
// !!(global as any).WebKitPoint;

// Determine download strategy
const downloadStrategy = isSecureContext || 'MozAppearance' in document.documentElement.style ? 'iframe' : 'navigate';

const streamSaverConfig: StreamSaverConfig = {
  supported: true,
  version: { full: '2.0.5', major: 2, minor: 0, dot: 5 },
  mitm: '/streamsaver/mitm.html?version=2.0.0',
};

/**
 * Create a hidden iframe and append it to the DOM
 */
function makeIframe(src: string): MitmTransporter {
  if (!src) throw new Error('iframe src is required');

  const iframe = document.createElement('iframe');
  iframe.hidden = true;
  iframe.src = src;
  iframe.name = 'iframe';

  let loaded = false;

  const transport: MitmTransporter = {
    frame: iframe,
    loaded: false,
    isIframe: true,
    isPopup: false,
    postMessage: (...args: any[]) => iframe.contentWindow?.postMessage(...args),
    remove: () => iframe.remove(),
    addEventListener: (type: string, listener: EventListener, options?: AddEventListenerOptions) =>
      iframe.addEventListener(type, listener, options),
    removeEventListener: (type: string, listener: EventListener) => iframe.removeEventListener(type, listener),
    dispatchEvent: (event: Event) => iframe.dispatchEvent(event),
  };

  iframe.addEventListener(
    'load',
    () => {
      loaded = true;
      transport.loaded = true;
    },
    { once: true },
  );

  document.body.appendChild(iframe);
  return transport;
}

/**
 * Create a popup window that simulates iframe behavior
 */
function makePopup(src: string): MitmTransporter {
  const options = 'width=200,height=100';
  const delegate = document.createDocumentFragment();
  const popupWindow = global.open(src, 'popup', options);

  const popup: MitmTransporter = {
    frame: popupWindow || undefined,
    loaded: false,
    isIframe: false,
    isPopup: true,
    remove: () => popupWindow?.close(),
    addEventListener: (...args: Parameters<EventTarget['addEventListener']>) => delegate.addEventListener(...args),
    dispatchEvent: (...args: Parameters<EventTarget['dispatchEvent']>) => delegate.dispatchEvent(...args),
    removeEventListener: (...args: Parameters<EventTarget['removeEventListener']>) =>
      delegate.removeEventListener(...args),
    postMessage: (...args: any[]) => popupWindow?.postMessage(...args),
  };

  const onReady = (evt: MessageEvent) => {
    if (evt.source === popupWindow) {
      popup.loaded = true;
      global.removeEventListener('message', onReady);
      popup.dispatchEvent(new Event('load'));
    }
  };

  global.addEventListener('message', onReady);

  return popup;
}

// Test if browser supports transferable streams
try {
  new Response(new ReadableStream());
  if (isSecureContext && !('serviceWorker' in navigator)) {
    useBlobFallback = true;
  }
} catch (err) {
  useBlobFallback = true;
}

// Test for transferable streams support
try {
  const { readable } = new TransformStream();
  const mc = new MessageChannel();
  mc.port1.postMessage(readable, [readable as any]);
  mc.port1.close();
  mc.port2.close();
  supportsTransferable = true;
} catch (err) {
  supportsTransferable = false;
}

/**
 * Load the MITM transporter (iframe or popup)
 */
function loadTransporter(): void {
  if (!mitmTransporter) {
    mitmTransporter = isSecureContext ? makeIframe(streamSaverConfig.mitm) : makePopup(streamSaverConfig.mitm);
  }
}

/**
 * Create a writable stream for downloading files
 */
export function createWriteStream(
  filename: string,
  options?: StreamSaverOptions,
  size?: number,
): WritableStream<Uint8Array> {
  let opts: StreamSaverOptions = {
    size: null,
    pathname: null,
    writableStrategy: undefined,
    readableStrategy: undefined,
  };

  let bytesWritten = 0;
  let downloadUrl: string | null = null;
  let channel: MessageChannel | null = null;
  let ts: TransformStream<Uint8Array, Uint8Array> | null = null;

  // Normalize arguments (backward compatibility)
  if (typeof options === 'number') {
    console.warn('[StreamSaver] Deprecated: pass an object as 2nd argument when creating a write stream');
    opts.size = options;
    opts.writableStrategy = size as any;
  } else if (options && (options as any).highWaterMark) {
    console.warn('[StreamSaver] Deprecated: pass an object as 2nd argument when creating a write stream');
    opts.size = size ?? null;
    opts.writableStrategy = options as any;
  } else {
    opts = { ...opts, ...options };
  }

  if (!useBlobFallback) {
    loadTransporter();

    channel = new MessageChannel();

    // Make filename RFC5987 compatible
    const encodedFilename = encodeURIComponent(filename.replace(/\//g, ':'))
      .replace(/['()]/g, escape)
      .replace(/\*/g, '%2A');

    const response: ServiceWorkerMessage = {
      transferringReadable: supportsTransferable,
      pathname: opts.pathname || Math.random().toString().slice(-6) + '/' + encodedFilename,
      headers: {
        'Content-Type': 'application/octet-stream; charset=utf-8',
        'Content-Disposition': "attachment; filename*=UTF-8''" + encodedFilename,
      },
    };

    if (opts.size) {
      response.headers['Content-Length'] = opts.size.toString();
    }

    const args: [ServiceWorkerMessage, string, MessagePort[]] = [response, '*', [channel.port2]];

    if (supportsTransferable) {
      const transformer =
        downloadStrategy === 'iframe'
          ? undefined
          : {
              transform(chunk: Uint8Array, controller: TransformStreamDefaultController<Uint8Array>) {
                if (!(chunk instanceof Uint8Array)) {
                  throw new TypeError('Can only write Uint8Arrays');
                }
                bytesWritten += chunk.length;
                controller.enqueue(chunk);

                if (downloadUrl) {
                  location.href = downloadUrl;
                  downloadUrl = null;
                }
              },
              flush() {
                if (downloadUrl) {
                  location.href = downloadUrl;
                }
              },
            };

      ts = new TransformStream(transformer, opts.writableStrategy, opts.readableStrategy);
      const readableStream = ts.readable;

      channel.port1.postMessage({ readableStream }, [readableStream as any]);
    }

    channel.port1.onmessage = (evt: MessageEvent<ServiceWorkerResponse>) => {
      if (evt.data.download) {
        if (downloadStrategy === 'navigate') {
          mitmTransporter?.remove();
          mitmTransporter = null;
          if (bytesWritten) {
            location.href = evt.data.download;
          } else {
            downloadUrl = evt.data.download;
          }
        } else {
          if (mitmTransporter?.isPopup) {
            mitmTransporter.remove();
            mitmTransporter = null;
            if (downloadStrategy === 'iframe') {
              makeIframe(streamSaverConfig.mitm);
            }
          }
          makeIframe(evt.data.download);
        }
      } else if (evt.data.abort) {
        chunks = [];
        channel?.port1.postMessage('abort');
        if (channel) {
          channel.port1.onmessage = null;
          channel.port1.close();
          channel.port2.close();
          channel = null;
        }
      }
    };

    if (mitmTransporter?.loaded) {
      mitmTransporter.postMessage(...args);
    } else {
      mitmTransporter?.addEventListener(
        'load',
        () => {
          mitmTransporter?.postMessage(...args);
        },
        { once: true },
      );
    }
  }

  let chunks: Uint8Array[] = [];

  return (
    (ts?.writable as WritableStream<Uint8Array>) ||
    new WritableStream<Uint8Array>(
      {
        write(chunk: Uint8Array) {
          if (!(chunk instanceof Uint8Array)) {
            throw new TypeError('Can only write Uint8Arrays');
          }

          if (useBlobFallback) {
            chunks.push(chunk);
            return;
          }

          channel?.port1.postMessage(chunk);
          bytesWritten += chunk.length;

          if (downloadUrl) {
            location.href = downloadUrl;
            downloadUrl = null;
          }
        },
        close() {
          if (useBlobFallback) {
            const blob = new Blob(chunks, {
              type: 'application/octet-stream; charset=utf-8',
            });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = filename;
            link.click();

            // Cleanup
            setTimeout(() => URL.revokeObjectURL(link.href), 10000);
          } else {
            channel?.port1.postMessage('end');
          }
        },
        abort() {
          chunks = [];
          channel?.port1.postMessage('abort');
          if (channel) {
            channel.port1.onmessage = null;
            channel.port1.close();
            channel.port2.close();
            channel = null;
          }
        },
      },
      opts.writableStrategy,
    )
  );
}

/**
 * Configure StreamSaver
 */
export function configure(config: Partial<StreamSaverConfig>): void {
  if (config.mitm) {
    streamSaverConfig.mitm = config.mitm;
  }
}

/**
 * Get current configuration
 */
export function getConfig(): StreamSaverConfig {
  return { ...streamSaverConfig };
}

// Export default object similar to original streamSaver
const streamSaver = {
  createWriteStream,
  configure,
  getConfig,
  WritableStream: global.WritableStream,
  supported: streamSaverConfig.supported,
  version: streamSaverConfig.version,
  mitm: streamSaverConfig.mitm,
};

export default streamSaver;
