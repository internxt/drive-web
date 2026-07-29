import envService from 'services/env.service';

const TURNSTILE_ACTION = 'checkout';
const TURNSTILE_TIMEOUT_MS = 10000;

export async function generateTurnstileToken(): Promise<string | undefined> {
  const siteKey = envService.getVariable('turnstileSiteKey');
  const turnstile = globalThis.turnstile;

  if (!siteKey || !turnstile) {
    return undefined;
  }

  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.top = '50%';
  container.style.left = '50%';
  container.style.transform = 'translate(-50%, -50%)';
  container.style.zIndex = '2147483647';
  document.body.appendChild(container);

  return new Promise<string | undefined>((resolve) => {
    let widgetId: string | undefined;
    let isSettled = false;

    const settle = (token?: string) => {
      if (isSettled) {
        return;
      }
      isSettled = true;
      clearTimeout(timeoutId);

      queueMicrotask(() => {
        if (widgetId) {
          turnstile.remove(widgetId);
        }
        container.remove();
      });

      resolve(token);
    };

    const timeoutId = setTimeout(() => settle(undefined), TURNSTILE_TIMEOUT_MS);

    widgetId = turnstile.render(container, {
      sitekey: siteKey,
      action: TURNSTILE_ACTION,
      execution: 'execute',
      appearance: 'interaction-only',
      callback: (token) => settle(token),
      'error-callback': () => settle(undefined),
      'expired-callback': () => settle(undefined),
    });

    if (!widgetId) {
      settle(undefined);
      return;
    }

    if (!isSettled) {
      turnstile.execute(widgetId);
    }
  });
}
