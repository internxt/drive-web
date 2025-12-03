export async function initializeServiceWorkers() {
  if ('serviceWorker' in navigator) {
    try {
      console.log('[ServiceWorkers] Registering StreamSaver worker...');
      const streamSaverRegistration = await navigator.serviceWorker.register('/streamsaver/stream-saver.js', {
        scope: '/streamsaver/',
      });
      console.log('[ServiceWorkers] StreamSaver worker registered:', streamSaverRegistration);

      if (streamSaverRegistration.installing || streamSaverRegistration.waiting) {
        await new Promise<void>((resolve) => {
          const worker = streamSaverRegistration.installing || streamSaverRegistration.waiting;
          if (worker) {
            worker.addEventListener('statechange', function listener() {
              if (worker.state === 'activated') {
                worker.removeEventListener('statechange', listener);
                resolve();
              }
            });
          } else {
            resolve();
          }
        });
      }
      console.log('[ServiceWorkers] StreamSaver worker ready');

      console.log('[ServiceWorkers] Registering video streaming worker...');
      const videoSwRegistration = await navigator.serviceWorker.register('/video-streaming.js', {
        scope: '/',
      });
      console.log('[ServiceWorkers] Video streaming worker registered:', videoSwRegistration);

      await navigator.serviceWorker.ready;
      console.log('[ServiceWorkers] Video streaming worker ready');

      console.log('[ServiceWorkers] All workers initialized successfully');
    } catch (error) {
      console.error('[ServiceWorkers] Failed to initialize service workers:', error);
    }
  } else {
    console.warn('[ServiceWorkers] Service Workers not supported in this browser');
  }
}
