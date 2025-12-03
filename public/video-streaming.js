/* global self Response console URL MessageChannel setTimeout */

const STREAM_PREFIX = '/video-stream/';

let currentSession = null;

self.addEventListener('install', (event) => {
  console.log('[video-sw] Service Worker installed, skipping waiting...');
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  console.log('[video-sw] Service Worker activated, claiming clients...');
  event.waitUntil(self.clients.claim());
});

self.addEventListener('message', (event) => {
  const eventData = event.data;

  if (eventData.type === 'PING') {
    if (event.ports && event.ports[0]) {
      event.ports[0].postMessage({ type: 'PONG' });
    } else if (event.source) {
      event.source.postMessage({ type: 'PONG' });
    }
    return;
  }

  if (eventData.type === 'CLAIM_CLIENTS') {
    console.log('[video-sw] Claiming clients...');
    self.clients.claim().then(() => {
      console.log('[video-sw] Clients claimed');
      if (event.ports && event.ports[0]) {
        event.ports[0].postMessage({ type: 'CLIENTS_CLAIMED' });
      }
    });
    return;
  }

  if (eventData.type === 'REGISTER_VIDEO_SESSION') {
    if (currentSession) {
      console.log('[video-sw] Replacing session:', currentSession.sessionId, '→', eventData.sessionId);
    }

    currentSession = {
      sessionId: eventData.sessionId,
      fileSize: eventData.fileSize,
    };

    console.log('[video-sw] Session registered:', currentSession.sessionId, 'fileSize:', currentSession.fileSize);
  }

  if (eventData.type === 'UNREGISTER_VIDEO_SESSION') {
    if (currentSession && currentSession.sessionId === eventData.sessionId) {
      console.log('[video-sw] Session unregistered:', eventData.sessionId);
      currentSession = null;
    } else {
      console.log('[video-sw] Ignoring unregister for old session:', eventData.sessionId);
    }
  }
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  if (!url.pathname.startsWith(STREAM_PREFIX)) {
    return;
  }

  const pathSessionId = url.pathname.replace(STREAM_PREFIX, '').split('/')[0];

  console.log('[video-sw] Fetch intercepted for session:', pathSessionId);

  event.respondWith(handleVideoStream(event.request, pathSessionId));
});

async function handleVideoStream(request, requestSessionId) {
  if (!currentSession) {
    console.error('[video-sw] No active session');
    return new Response('No active session', { status: 404 });
  }

  if (currentSession.sessionId !== requestSessionId) {
    console.error('[video-sw] Session mismatch:', requestSessionId, '!= current:', currentSession.sessionId);
    return new Response('Session mismatch - video changed', { status: 410 });
  }

  const { sessionId, fileSize } = currentSession;

  const rangeHeader = request.headers.get('Range');
  console.log('[video-sw] Handling request, session:', sessionId, 'range:', rangeHeader);

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

  if (end >= fileSize) {
    end = fileSize - 1;
  }

  if (start > end) {
    return new Response('Invalid range', { status: 416 });
  }

  const requestId = `${sessionId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  console.log('[video-sw] Requesting chunk:', { sessionId, start, end, requestId });

  try {
    const chunk = await requestChunkFromClient({
      sessionId,
      start,
      end,
      fileSize,
      requestId,
    });

    if (!currentSession || currentSession.sessionId !== sessionId) {
      console.log('[video-sw] Session changed during chunk fetch, aborting');
      return new Response('Session changed', { status: 410 });
    }

    console.log('[video-sw] Chunk received:', chunk.byteLength, 'bytes');

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
    console.error('[video-sw] Stream error:', error.message);
    return new Response('Stream error: ' + error.message, { status: 500 });
  }
}

function requestChunkFromClient(request) {
  return new Promise((resolve, reject) => {
    const channel = new MessageChannel();
    let timeoutId;

    channel.port1.onmessage = (event) => {
      const response = event.data;

      if (response.requestId !== request.requestId) {
        console.warn('[video-sw] RequestId mismatch, ignoring');
        return;
      }

      clearTimeout(timeoutId);

      if (response.error) {
        channel.port1.close();
        reject(new Error(response.error));
      } else if (response.data) {
        channel.port1.close();
        resolve(response.data);
      } else {
        channel.port1.close();
        reject(new Error('No data received'));
      }
    };

    self.clients.matchAll({ type: 'window' }).then((clients) => {
      if (clients.length === 0) {
        reject(new Error('No clients available'));
        return;
      }

      console.log('[video-sw] Sending CHUNK_REQUEST to client, requestId:', request.requestId);
      clients[0].postMessage({ type: 'CHUNK_REQUEST', payload: request }, [channel.port2]);
    });

    timeoutId = setTimeout(() => {
      console.error('[video-sw] Chunk request timeout:', request.requestId);
      channel.port1.close();
      reject(new Error('Chunk request timeout'));
    }, 30000);
  });
}
