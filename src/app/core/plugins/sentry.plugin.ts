import * as Sentry from '@sentry/react';
import { envConfig } from 'app/core/services/env.service';
import packageJson from '../../../../package.json';
import { AppPlugin } from '../../core/types';

const sentryPlugin: AppPlugin = {
  install(): void {
    Sentry.init({
      dsn: envConfig.services.sentryDsn,
      integrations: [Sentry.browserTracingIntegration()],
      tracesSampleRate: 0.3,
      debug: envConfig.app.nodeEnv !== 'production' && envConfig.app.debug === 'true',
      environment: envConfig.app.nodeEnv,
      release: packageJson.name + '@' + packageJson.version,
    });
  },
};

export default sentryPlugin;
