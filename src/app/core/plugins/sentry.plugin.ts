import * as Sentry from '@sentry/react';
import packageJson from '../../../../package.json';
import { AppPlugin } from '../../core/types';

const sentryPlugin: AppPlugin = {
  install(): void {
    Sentry.init({
      dsn: process.env.REACT_APP_SENTRY_DSN,
      integrations: [new Sentry.BrowserTracing()],
      tracesSampleRate: 0.3,
      debug: process.env.NODE_ENV !== 'production' && process.env.REACT_APP_DEBUG === 'true',
      environment: process.env.NODE_ENV,
      release: packageJson.name + '@' + packageJson.version,
    });
  },
};

export default sentryPlugin;
