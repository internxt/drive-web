import * as Sentry from '@sentry/react';
import envService from 'services/env.service';
import packageJson from '../../../../package.json';
import { AppPlugin } from '../../core/types';

const sentryPlugin: AppPlugin = {
  install(): void {
    Sentry.init({
      dsn: envService.getVariable('sentryDsn'),
      integrations: [Sentry.browserTracingIntegration()],
      tracesSampleRate: 0.3,
      debug: envService.getVariable('nodeEnv') !== 'production' && envService.getVariable('debug') === 'true',
      environment: envService.getVariable('nodeEnv'),
      release: packageJson.name + '@' + packageJson.version,
    });
  },
};

export default sentryPlugin;
