import * as Sentry from '@sentry/react';
import { BrowserTracing } from '@sentry/tracing';
import { AppPlugin } from '../../core/types';
import packageJson from '../../../../package.json';
import dynamicEnvService from '../services/dynamicEnv.service';

const sentryPlugin: AppPlugin = {
  install(): void {
    Sentry.init({
      dsn: dynamicEnvService.selectedEnv.REACT_APP_SENTRY_DSN,
      integrations: [new BrowserTracing()],
      tracesSampleRate: 1.0,
      debug: process.env.NODE_ENV !== 'production',
      environment: process.env.NODE_ENV,
      release: packageJson.name + '@' + packageJson.version,
    });
  },
};

export default sentryPlugin;
