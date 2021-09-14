/// <reference types="react-scripts" />

declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV: 'development' | 'production' | 'test';
    PUBLIC_URL: string;
    REACT_APP_API_URL: string;
    REACT_APP_CRYPTO_SECRET: string;
    REACT_APP_CRYPTO_SECRET2: string;
    REACT_APP_BRIDGE: string;
    REACT_APP_STRIPE_PK: string;
    REACT_APP_STRIPE_TEST_PK: string;
    REACT_APP_SEGMENT_KEY: string;
    REACT_APP_SEGMENT_DEBUG: string;
    REACT_APP_RECAPTCHA_V3: string;
  }
}

interface SegmentAnalytics {
  identify: any;
  track: (eventName: string, params?: any, options?: any, callback?: function) => void;
  page: (pageName: string) => void;
  reset: any;
}

interface Window {
  Stripe: any;
  analytics: SegmentAnalytics;
  _adftrack: any;
  grecaptcha: {
    ready: (cb: () => void) => void,
    execute: (siteKey: string, { action: string }) => Promise<string>;
  };
}
