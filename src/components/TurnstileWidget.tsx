import { Turnstile, type TurnstileInstance } from '@marsidev/react-turnstile';
import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { envService } from 'services';

export interface TurnstileWidgetHandle {
  getToken: (forceRefresh?: boolean) => Promise<string | undefined>;
}

interface TurnstileWidgetProps {
  action: string;
}

const TurnstileWidget = forwardRef<TurnstileWidgetHandle, TurnstileWidgetProps>(({ action }, ref) => {
  const widgetRef = useRef<TurnstileInstance>();
  const siteKey = envService.getVariable('turnstileSiteKey');
  const isEnabled = envService.getVariable('turnstileEnabled') === 'true' && !!siteKey;
  const [isChallengeVisible, setIsChallengeVisible] = useState(false);
  const [failed, setFailed] = useState(false);

  useImperativeHandle(ref, () => ({
    getToken: async (forceRefresh = false) => {
      if (failed) {
        return undefined;
      }
      if (forceRefresh) {
        widgetRef.current?.reset();
        widgetRef.current?.execute();
      }

      const token = await widgetRef.current?.getResponsePromise().catch(() => undefined);
      if (token) {
        widgetRef.current?.reset();
        setIsChallengeVisible(false);
      }
      return token;
    },
  }));

  if (!isEnabled || failed) {
    return null;
  }

  return (
    <div className={isChallengeVisible ? undefined : 'hidden'}>
      <Turnstile
        ref={widgetRef}
        siteKey={siteKey}
        options={{ execution: 'render', action, appearance: 'interaction-only' }}
        onBeforeInteractive={() => setIsChallengeVisible(true)}
        onError={() => setFailed(true)}
      />
    </div>
  );
});

TurnstileWidget.displayName = 'TurnstileWidget';

export default TurnstileWidget;
