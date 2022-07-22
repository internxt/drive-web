async function isServiceWorkerAvailable(): Promise<boolean> {
  const serviceWorkerIsSupported = 'serviceWorker' in navigator;
  let serviceWorkerIsAllowed = true;

  try {
    await navigator.serviceWorker.register('./');
  } catch {
    serviceWorkerIsAllowed = false;
  }

  return serviceWorkerIsSupported && serviceWorkerIsAllowed;
}

export default {
  isServiceWorkerAvailable
};
