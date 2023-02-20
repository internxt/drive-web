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
        throw new Error('Analytics library not loaded');
      }
    }
    return Analytics.instance;
  }

  public track(eventName, properties) {
    try {
      Analytics.instance.track(eventName, properties);
    } catch (err) {
      //NO OP
    }
  }
}
