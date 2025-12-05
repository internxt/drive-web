/* global self Response console URL MessageChannel setTimeout clearTimeout */

const STREAM_PREFIX = '/video-stream/';

let currentSession = null;
const MESSAGE_TYPES = {
  PING: 'PING',
  CLAIM_CLIENTS: 'CLAIM_CLIENTS',
  REGISTER_VIDEO_SESSION: 'REGISTER_VIDEO_SESSION',
  UNREGISTER_VIDEO_SESSION: 'UNREGISTER_VIDEO_SESSION',
};
const DEFAULT_CHUNK_SIZE = 5 * 1024 * 1024;
const CHUNK_REQUEST_TIMEOUT = 30 * 1000;

/**
 * Waiting until the Service Worker is installed
 */
self.addEventListener('install', (event) => {
  console.log('[video-sw] Service Worker installed, skipping waiting...');
  event.waitUntil(self.skipWaiting());
});

/**
 * The Service Worker is activated, so we claim the clients so the client (our app) can send and receive messages
 */
self.addEventListener('activate', (event) => {
  console.log('[video-sw] Service Worker activated, claiming clients...');
  event.waitUntil(self.clients.claim());
});

/**
 * Receiving messages from the client (our app)
 */
self.addEventListener('message', (event) => {
  const eventData = event.data;

  switch (eventData.type) {
    // Handle PING messages - used to keep the Service Worker alive
    case MESSAGE_TYPES.PING:
      if (event.ports && event.ports[0]) {
        event.ports[0].postMessage({ type: 'PONG' });
      } else if (event.source) {
        event.source.postMessage({ type: 'PONG' });
      }
      break;

    // Handle CLAIM_CLIENTS messages - used to claim the clients when the user refreshes the app, for example.
    // When the user refreshes the app, the Service worker is activated but it does not have the control over the clients,
    // so we need to claim them again so we can send and receive messages from the client (our app).
    case MESSAGE_TYPES.CLAIM_CLIENTS:
      console.log('[video-sw] Claiming clients...');
      self.clients.claim().then(() => {
        console.log('[video-sw] Clients claimed');
        if (event.ports && event.ports[0]) {
          event.ports[0].postMessage({ type: 'CLIENTS_CLAIMED' });
        }
      });
      break;

    // Handle REGISTER_VIDEO_SESSION and UNREGISTER_VIDEO_SESSION messages - used to register and unregister video sessions.
    // It helps us to just handle the video stream for the current session (current video) as sometimes we can have fetch from another file and causes
    // the video stream to stop working because we are mixing video streams in the "current session".
    case MESSAGE_TYPES.REGISTER_VIDEO_SESSION:
      if (currentSession) {
        console.log('[video-sw] Replacing session:', currentSession.sessionId, '→', eventData.sessionId);
      }

      currentSession = {
        sessionId: eventData.sessionId,
        fileSize: eventData.fileSize,
        mimeType: eventData.mimeType || 'video/mp4',
      };

      console.log(
        '[video-sw] Session registered:',
        currentSession.sessionId,
        'fileSize:',
        currentSession.fileSize,
        'mimeType:',
        currentSession.mimeType,
      );
      break;

    case MESSAGE_TYPES.UNREGISTER_VIDEO_SESSION:
      if (currentSession && currentSession.sessionId === eventData.sessionId) {
        console.log('[video-sw] Session unregistered:', eventData.sessionId);
        currentSession = null;
      } else {
        console.log('[video-sw] Ignoring unregister for old session:', eventData.sessionId);
      }
      break;

    default:
      break;
  }
});

/**
 * Intercepting fetch requests, by filtering the ones that start with the STREAM_PREFIX
 * so we will handle the video stream requests for the current session
 */
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  if (!url.pathname.startsWith(STREAM_PREFIX)) {
    return;
  }

  const pathSessionId = url.pathname.replace(STREAM_PREFIX, '').split('/')[0];

  console.log('[video-sw] Fetch intercepted for session:', pathSessionId);

  event.respondWith(handleVideoStream(event.request, pathSessionId));
});

function isSessionActive(sessionId) {
  return currentSession && currentSession.sessionId === sessionId;
}

/**
 * Handles the video stream requests for the current session. It gets the Range header
 * from the request and returns it the chunk start and end to the client so we can download + decrypt
 * the part that the <video> tag is requesting. This way, the <video> tag is the one that manages the video
 * stream.
 */
async function handleVideoStream(request, requestSessionId) {
  if (!currentSession) {
    return new Response('No active session', { status: 404 });
  }

  if (!isSessionActive(requestSessionId)) {
    return new Response('Session mismatch - video changed', { status: 410 });
  }

  const { sessionId, fileSize, mimeType } = currentSession;

  const rangeHeader = request.headers.get('Range');
  console.log('[video-sw] Handling request, session:', sessionId, 'range:', rangeHeader);

  if (!rangeHeader) {
    return new Response(null, {
      status: 200,
      headers: {
        'Accept-Ranges': 'bytes',
        'Content-Length': fileSize.toString(),
        'Content-Type': mimeType,
      },
    });
  }

  const match = rangeHeader.match(/bytes=(\d+)-(\d*)/);
  if (!match) {
    return new Response('Invalid Range', { status: 416 });
  }

  // Get the start and end of the range. If the end is not provided, we will set it to 5MB
  const start = parseInt(match[1], 10);
  let end;

  if (match[2]) {
    end = parseInt(match[2], 10);
  } else {
    end = Math.min(start + DEFAULT_CHUNK_SIZE - 1, fileSize - 1);
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

  // Generate a unique request id
  const requestId = `${sessionId}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

  console.log('[video-sw] Requesting chunk:', { sessionId, start, end, requestId });

  // Request the chunk we downloaded + decrypted from the client to simulate a "real" fetch request
  // so we can decrypt and stream the part the <video> tag is requesting
  try {
    const chunk = await requestChunkFromClient({
      sessionId,
      start,
      end,
      fileSize,
      requestId,
    });

    if (!isSessionActive(requestSessionId)) {
      console.log('[video-sw] Session changed during chunk fetch, aborting');
      return new Response('Session changed', { status: 410 });
    }

    console.log('[video-sw] Chunk received:', chunk.byteLength, 'bytes');

    // Send the chunk to the client with the correct headers
    return new Response(chunk, {
      status: 206,
      headers: {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Content-Length': (end - start + 1).toString(),
        'Content-Type': mimeType,
        'Accept-Ranges': 'bytes',
      },
    });
  } catch (error) {
    return new Response('Stream error: ' + error.message, { status: 500 });
  }
}

/**
 *
 * @param request - { sessionId, start, end, fileSize, requestId }
 * @returns {Promise<Uint8Array>} - The chunk data
 */
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
      channel.port1.close();
      reject(new Error('Chunk request timeout'));
    }, CHUNK_REQUEST_TIMEOUT);
  });
}
