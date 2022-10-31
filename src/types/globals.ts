export {};

declare global {
  interface Window {
    __RUNTIME_CONFIG__: {
      NODE_ENV: 'development' | 'production' | 'test';
      PUBLIC_URL: string;
      REACT_APP_API_URL: string;
      REACT_APP_DRIVE_NEW_API_URL: string;
      REACT_APP_PHOTOS_API_URL: string;
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
    };
  }
}
