export default class Analytics {
  private static instance: Analytics;

  private constructor() {
    const analytics = window.rudderanalytics;
    return analytics;
  }

  public static getInstance(): Analytics {
    if (!Analytics.instance) {
      Analytics.instance = new Analytics();
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
