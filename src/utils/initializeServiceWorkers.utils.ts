export async function initializeServiceWorkers() {
  if ('serviceWorker' in navigator) {
    try {
      // Remove existing service worker in the main scope (/) to avoid conflicts
      const mainScopeRegistration = await navigator.serviceWorker.getRegistration('/');
      if (mainScopeRegistration) {
        await mainScopeRegistration.unregister();
        console.log('[ServiceWorkers] Removed service worker from main scope (/)');
      }

      console.log('[ServiceWorkers] Registering StreamSaver worker...');
      await navigator.serviceWorker.register('/streamsaver/stream-saver.js', {
        scope: '/streamsaver/',
      });
      console.log('[ServiceWorkers] StreamSaver worker registered');

      console.log('[ServiceWorkers] Registering video streaming worker...');
      await navigator.serviceWorker.register('/video-stream/video-streaming.js', {
        scope: '/video-stream/',
      });
      console.log('[ServiceWorkers] Video streaming worker registered');

      await navigator.serviceWorker.ready;
      console.log('[ServiceWorkers] All service workers ready');

      console.log('[ServiceWorkers] All workers initialized successfully');
    } catch (error) {
      console.error('[ServiceWorkers] Failed to initialize service workers:', error);
    }
  } else {
    console.warn('[ServiceWorkers] Service Workers not supported in this browser');
  }
}
