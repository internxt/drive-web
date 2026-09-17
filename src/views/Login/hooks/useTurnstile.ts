import { useCallback, useEffect, useRef } from 'react';
import envService from 'services/env.service';

const SCRIPT_ID = 'cf-turnstile-script';
const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
const ACTION = 'login';

const isTurnstileEnabled = () =>
  envService.getVariable('turnstileEnabled') === 'true' && !!envService.getVariable('turnstileSiteKey');

function loadScript(): Promise<void> {
  if (globalThis.turnstile) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const existingScript = document.getElementById(SCRIPT_ID);
    const script = (existingScript as HTMLScriptElement | null) ?? document.createElement('script');

    script.addEventListener('load', () => resolve(), { once: true });
    script.addEventListener(
      'error',
      () => {
        script.remove();
        reject(new Error('Failed to load the Turnstile script'));
      },
      { once: true },
    );

    if (!existingScript) {
      script.id = SCRIPT_ID;
      script.src = SCRIPT_SRC;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
  });
}

export default function useTurnstile() {
  const widgetIdRef = useRef<string>();
  const onTokenRef = useRef<(token?: string) => void>(() => undefined);
  const containerRef = useRef<HTMLDivElement>();
  containerRef.current ??= document.createElement('div');

  const renderWidget = useCallback(async () => {
    if (widgetIdRef.current !== undefined) return widgetIdRef.current;

    await loadScript();

    const turnstile = globalThis.turnstile;
    const container = containerRef.current;
    if (!turnstile || !container) throw new Error('Turnstile is not ready');

    const notify = (token?: string) => onTokenRef.current(token);

    widgetIdRef.current = turnstile.render(container, {
      sitekey: envService.getVariable('turnstileSiteKey'),
      action: ACTION,
      execution: 'execute',
      callback: notify,
      'error-callback': () => notify(),
      'timeout-callback': () => notify(),
    });

    return widgetIdRef.current;
  }, []);

  useEffect(() => {
    if (!isTurnstileEnabled()) return;

    const container = containerRef.current as HTMLDivElement;
    container.style.display = 'none';
    document.body.appendChild(container);

    renderWidget().catch(() => undefined);

    return () => {
      const widgetId = widgetIdRef.current;
      if (widgetId !== undefined) {
        globalThis.turnstile?.remove(widgetId);
        widgetIdRef.current = undefined;
      }
      container.remove();
    };
  }, [renderWidget]);

  const getToken = useCallback(async (): Promise<string | undefined> => {
    if (!isTurnstileEnabled()) return undefined;

    try {
      const widgetId = await renderWidget();

      return await new Promise<string | undefined>((resolve) => {
        onTokenRef.current = (token?: string) => {
          onTokenRef.current = () => undefined;
          resolve(token);
        };

        globalThis.turnstile?.reset(widgetId);
        globalThis.turnstile?.execute(widgetId, { action: ACTION });
      });
    } catch {
      return undefined;
    }
  }, [renderWidget]);

  return { getToken };
}
