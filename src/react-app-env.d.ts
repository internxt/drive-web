/// <reference types="react-scripts" />

declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV: 'development' | 'production' | 'test';
    PUBLIC_URL: string;
    REACT_APP_NODE_ENV: string;
    REACT_APP_API_URL: string;
    REACT_APP_DRIVE_NEW_API_URL: string;
    REACT_APP_PAYMENTS_API_URL: string;
    REACT_APP_CRYPTO_SECRET: string;
    REACT_APP_CRYPTO_SECRET2: string;
    REACT_APP_BRIDGE: string;
    REACT_APP_PROXY: string;
    REACT_APP_NOTIFICATIONS_URL: string;
    REACT_APP_STRIPE_PK: string;
    REACT_APP_STRIPE_TEST_PK: string;
    REACT_APP_SEGMENT_KEY: string;
    REACT_APP_SEGMENT_DEBUG: string;
    REACT_APP_RECAPTCHA_V3: string;
    REACT_APP_SHARE_LINKS_DOMAIN: string;
    REACT_APP_HOSTNAME: string;
  }
}

interface Window {
  Stripe: stripe.StripeStatic;
  gtag: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _adftrack: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rudderanalytics: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rdt: any;
  grecaptcha: {
    ready: (cb: () => void) => void;
    execute: (siteKey: string, { action: string }) => Promise<string>;
  };
  performance: {
    memory?: {
      jsHeapSizeLimit: number;
      totalJSHeapSize: number;
      usedJSHeapSize: number;
    };
  };
}

interface Navigator {
  brave?: { isBrave: () => Promise<boolean> };
}
