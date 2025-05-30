import * as Sentry from '@sentry/react';
import { BrowserTracing } from '@sentry/tracing';
import packageJson from '../../../../package.json';
import { AppPlugin } from '../../core/types';
import { envConfig } from 'app/core/services/env.service';

const sentryPlugin: AppPlugin = {
  install(): void {
    Sentry.init({
      dsn: envConfig.services.sentryDsn,
      integrations: [new BrowserTracing()],
      tracesSampleRate: 0.3,
      debug: envConfig.app.nodeEnv !== 'production' && envConfig.app.debug === 'true',
      environment: envConfig.app.nodeEnv,
      release: packageJson.name + '@' + packageJson.version,
    });
  },
};

export default sentryPlugin;
