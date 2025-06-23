import * as Sentry from '@sentry/react';
import envService from 'app/core/services/env.service';
import packageJson from '../../../../package.json';
import { AppPlugin } from '../../core/types';

const sentryPlugin: AppPlugin = {
  install(): void {
    Sentry.init({
      dsn: envService.getVaribale('sentryDsn'),
      integrations: [Sentry.browserTracingIntegration()],
      tracesSampleRate: 0.3,
      debug: envService.getVaribale('nodeEnv') !== 'production' && envService.getVaribale('debug') === 'true',
      environment: envService.getVaribale('nodeEnv'),
      release: packageJson.name + '@' + packageJson.version,
    });
  },
};

export default sentryPlugin;
