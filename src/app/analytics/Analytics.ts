// analytics.ts
import { sendAnalyticsError } from './utils';
import errorService from '../core/services/error.service';

const CONTEXT_APP_NAME = 'drive-web';

class RudderAnalyticsWrapper {
  constructor() {
    const method = 'track';

    const originalMethod = window.rudderanalytics[method];
    window.rudderanalytics[method] = (...args: any[]) => {
      args[2] = args[2] || {};
      args[2].context = args[2].context || {};
      args[2].context.app = args[2].context.app || {};
      args[2].context.app.name = CONTEXT_APP_NAME;

      return originalMethod.apply(window.rudderanalytics, args);
    };
  }
}

new RudderAnalyticsWrapper();

export default class Analytics {
  private static instance: Analytics;

  private constructor() {
    const analytics = window.rudderanalytics;
    return analytics;
  }

  public static getInstance(): Analytics {
    if (!Analytics.instance) {
      Analytics.instance = new Analytics();
      if (typeof Analytics.instance === 'undefined') {
        // Analytics library have not loaded properly
        sendAnalyticsError('Analytics library not loaded');
      }
    }
    return Analytics.instance;
  }

  public track(eventName: string, properties: any) {
    try {
      Analytics.instance.track(eventName, properties);
    } catch (err) {
      const castedError = errorService.castError(err);
      sendAnalyticsError(castedError.message);
    }
  }
}
