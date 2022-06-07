import * as Sentry from '@sentry/react';
import { BrowserTracing } from '@sentry/tracing';
import { AppPlugin } from '../../core/types';

const sentryPlugin: AppPlugin = {
  install(): void {
    Sentry.init({
      dsn: process.env.REACT_APP_SENTRY_DSN,
      integrations: [new BrowserTracing()],
      tracesSampleRate: 1.0,
      debug: process.env.NODE_ENV !== 'production' ? true : false,
      environment: process.env.NODE_ENV
    });
  },
};

export default sentryPlugin;
