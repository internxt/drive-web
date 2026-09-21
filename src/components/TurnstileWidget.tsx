import { Turnstile, type TurnstileInstance } from '@marsidev/react-turnstile';
import { forwardRef, useImperativeHandle, useRef } from 'react';
import { envService } from 'services';

export interface TurnstileWidgetHandle {
  getToken: () => Promise<string | undefined>;
}

interface TurnstileWidgetProps {
  action: string;
}

const TurnstileWidget = forwardRef<TurnstileWidgetHandle, TurnstileWidgetProps>(({ action }, ref) => {
  const widgetRef = useRef<TurnstileInstance>();
  const siteKey = envService.getVariable('turnstileSiteKey');
  const isEnabled = envService.getVariable('turnstileEnabled') === 'true' && !!siteKey;

  useImperativeHandle(ref, () => ({
    getToken: async () => {
      widgetRef.current?.reset();
      widgetRef.current?.execute();
      return widgetRef.current?.getResponsePromise().catch(() => undefined);
    },
  }));

  if (!isEnabled) {
    return null;
  }

  return (
    <Turnstile
      ref={widgetRef}
      siteKey={siteKey}
      options={{ execution: 'execute', action, appearance: 'interaction-only' }}
    />
  );
});

TurnstileWidget.displayName = 'TurnstileWidget';

export default TurnstileWidget;
