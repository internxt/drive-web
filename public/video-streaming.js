/* global self Response console URL MessageChannel setTimeout */

const STREAM_PREFIX = '/video-stream/';

let session = null;

self.addEventListener('install', (event) => {
  console.log('[video-sw] Service Worker installed, skipping waiting...');
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  console.log('[video-sw] Service Worker activated, claiming clients...');
  event.waitUntil(self.clients.claim());
});

// Escuchar mensajes del cliente para registrar sesiones
self.addEventListener('message', (event) => {
  const eventData = event.data;

  if (eventData.type === 'REGISTER_VIDEO_SESSION') {
    session = {
      fileSize: eventData.fileSize,
    };
  }

  if (eventData.type === 'UNREGISTER_VIDEO_SESSION') {
    session = null;
  }
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  if (!url.pathname.startsWith(STREAM_PREFIX)) {
    return;
  }

  event.respondWith(handleVideoStream(event.request));
});

async function handleVideoStream(request) {
  if (!session) {
    return new Response('Session not found', { status: 404 });
  }

  const { fileSize } = session;
  console.log(`[SW] FILE SIZE: ${fileSize}`);
  const rangeHeader = request.headers.get('Range');

  if (!rangeHeader) {
    return new Response(null, {
      status: 200,
      headers: {
        'Accept-Ranges': 'bytes',
        'Content-Length': fileSize.toString(),
        'Content-Type': 'video/mp4',
      },
    });
  }

  const match = rangeHeader.match(/bytes=(\d+)-(\d*)/);
  if (!match) {
    return new Response('Invalid Range', { status: 416 });
  }

  const start = parseInt(match[1], 10);
  let end;
  if (match[2]) {
    end = parseInt(match[2], 10);
  } else {
    end = Math.min(start + 5 * 1024 * 1024 - 1, fileSize - 1);
  }

  if (start >= fileSize) {
    return new Response('Range not satisfiable', {
      status: 416,
      headers: {
        'Content-Range': `bytes */${fileSize}`,
      },
    });
  }

  if (end > fileSize) {
    end = fileSize - 1;
  }

  if (start > end) {
    return new Response('Invalid range', { status: 416 });
  }

  const requestId = `${Date.now()}-${Math.random()}`;

  try {
    const chunk = await requestChunkFromClient({
      start,
      end,
      fileSize,
      requestId,
    });

    return new Response(chunk, {
      status: 206,
      headers: {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Content-Length': (end - start + 1).toString(),
        'Content-Type': 'video/mp4',
        'Accept-Ranges': 'bytes',
      },
    });
  } catch (error) {
    return new Response('Stream error', { status: 500 });
  }
}

function requestChunkFromClient(request) {
  return new Promise((resolve, reject) => {
    const channel = new MessageChannel();

    channel.port1.onmessage = (event) => {
      const response = event.data;

      if (response.requestId !== request.requestId) {
        return;
      }

      if (response.error) {
        reject(new Error(response.error));
      } else if (response.data) {
        resolve(response.data);
      } else {
        reject(new Error('No data received'));
      }

      channel.port1.close();
    };

    self.clients.matchAll().then((clients) => {
      if (clients.length === 0) {
        reject(new Error('No clients available'));
        return;
      }

      clients[0].postMessage({ type: 'CHUNK_REQUEST', payload: request }, [channel.port2]);
    });

    setTimeout(() => {
      reject(new Error('Chunk request timeout'));
      channel.port1.close();
    }, 30000);
  });
}
