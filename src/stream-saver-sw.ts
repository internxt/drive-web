/// <reference lib="webworker" />

/* eslint-disable @typescript-eslint/no-explicit-any */

type StreamMetadata = [ReadableStream<Uint8Array> | null, any, MessagePort];

const sw = self as unknown as ServiceWorkerGlobalScope;

sw.addEventListener('install', () => {
  sw.skipWaiting();
});

sw.addEventListener('activate', (event) => {
  event.waitUntil(sw.clients.claim());
});

const map = new Map<string, StreamMetadata>();

sw.addEventListener('message', (event) => {
  if (event.data === 'ping') return;

  const data = event.data;
  const downloadUrl =
    data.url || sw.registration.scope + Math.random() + '/' + (typeof data === 'string' ? data : data.filename);

  const port = event.ports && event.ports[0] ? event.ports[0] : null;
  const metadata: StreamMetadata = [null, data, port as MessagePort];

  if (event.data && (event.data as any).readableStream) {
    metadata[0] = (event.data as any).readableStream as ReadableStream<Uint8Array>;
  } else if (event.data && (event.data as any).transferringReadable) {
    if (port) {
      port.onmessage = (evt) => {
        port.onmessage = null;
        metadata[0] = (evt.data as any).readableStream as ReadableStream<Uint8Array>;
      };
    }
  } else {
    metadata[0] = createStream(port as MessagePort);
  }

  map.set(downloadUrl, metadata);
  if (port) {
    port.postMessage({ download: downloadUrl });
  }
});

function createStream(port?: MessagePort | null): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      if (!port) {
        controller.error('No message port provided');
        return;
      }
      port.onmessage = ({ data }: MessageEvent) => {
        if (data === 'end') {
          controller.close();
          return;
        }
        if (data === 'abort') {
          controller.error('Aborted the download');
          return;
        }
        controller.enqueue(data as Uint8Array);
      };
    },
    cancel(reason) {
      if (port) {
        port.postMessage({ abort: true });
      }
      // eslint-disable-next-line no-console
      console.log('[SW] User aborted download:', reason);
    },
  });
}

sw.addEventListener('fetch', (event) => {
  const url = event.request.url;

  if (url.endsWith('/ping')) {
    event.respondWith(new Response('pong'));
    return;
  }

  const hijacked = map.get(url);
  if (!hijacked) return;

  const [stream, data, port] = hijacked;
  map.delete(url);

  const responseHeaders = new Headers({
    'Content-Type': 'application/octet-stream; charset=utf-8',
    'Content-Security-Policy': "default-src 'none'",
    'X-Content-Security-Policy': "default-src 'none'",
    'X-WebKit-CSP': "default-src 'none'",
    'X-XSS-Protection': '1; mode=block',
    'Cross-Origin-Embedder-Policy': 'require-corp',
  });

  const headers = new Headers(data.headers || {});

  if (headers.has('Content-Length')) {
    responseHeaders.set('Content-Length', headers.get('Content-Length') || '');
  }

  if (headers.has('Content-Disposition')) {
    responseHeaders.set('Content-Disposition', headers.get('Content-Disposition') || '');
  }

  if (data.size) {
    // eslint-disable-next-line no-console
    console.warn('[SW] data.size is deprecated, use Content-Length header');
    responseHeaders.set('Content-Length', String(data.size));
  }

  let fileName = typeof data === 'string' ? data : data.filename;
  if (fileName) {
    // eslint-disable-next-line no-console
    console.warn('[SW] data.filename is deprecated, use Content-Disposition header');
    fileName = encodeURIComponent(fileName).replace(/['()]/g, escape).replace(/\*/g, '%2A');
    responseHeaders.set('Content-Disposition', "attachment; filename*=UTF-8''" + fileName);
  }

  event.respondWith(new Response(stream as ReadableStream<Uint8Array>, { headers: responseHeaders }));
  if (port) {
    port.postMessage({ debug: 'Download started' });
  }
});
