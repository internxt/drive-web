function isProduction(): boolean {
  if (import.meta.env.REACT_APP_NODE_ENV === 'staging') return false;
  return import.meta.env.MODE === 'production' || import.meta.env.REACT_APP_NODE_ENV === 'production';
}

const envService = {
  isProduction,
};

export default envService;

function getEnvVar(name: keyof NodeJS.ProcessEnv): string {
  const value = import.meta.env[name];
  return value!;
}

export const envConfig = {
  app: {
    nodeEnv: getEnvVar('NODE_ENV'),
    mode: getEnvVar('MODE'),
    debug: getEnvVar('REACT_APP_DEBUG'),
    generateSourceMap: getEnvVar('GENERATE_SOURCEMAP'),
    hostname: getEnvVar('REACT_APP_HOSTNAME'),
    websiteUrl: getEnvVar('REACT_APP_WEBSITE_URL'),
    baseUrl: getEnvVar('REACT_APP_BASE_URL'),
  },

  crypto: {
    secret: getEnvVar('REACT_APP_CRYPTO_SECRET'),
    secret2: getEnvVar('REACT_APP_CRYPTO_SECRET2'),
    magicIv: getEnvVar('REACT_APP_MAGIC_IV'),
    magicSalt: getEnvVar('REACT_APP_MAGIC_SALT'),
  },

  stripe: {
    publicKey: getEnvVar('REACT_APP_STRIPE_PK'),
    testPublicKey: getEnvVar('REACT_APP_STRIPE_TEST_PK'),
  },

  api: {
    api: getEnvVar('REACT_APP_API_URL'),
    newApi: getEnvVar('REACT_APP_DRIVE_NEW_API_URL'),
    payments: getEnvVar('REACT_APP_PAYMENTS_API_URL'),
    location: getEnvVar('REACT_APP_LOCATION_API_URL'),
  },

  auth: {
    authUrl: getEnvVar('REACT_APP_AUTH_URL'),
    buttonAuthUrl: getEnvVar('REACT_APP_BUTTON_AUTH_URL'),
  },

  services: {
    storjBridge: getEnvVar('REACT_APP_STORJ_BRIDGE'),
    segmentKey: getEnvVar('REACT_APP_SEGMENT_KEY'),
    intercomProviderKey: getEnvVar('REACT_APP_INTERCOM_PROVIDER_KEY'),
    sentryDsn: getEnvVar('REACT_APP_SENTRY_DSN'),
    recaptchaV3: getEnvVar('REACT_APP_RECAPTCHA_V3'),
    avatarUrl: getEnvVar('REACT_APP_AVATAR_URL'),
    shareLinksDomain: getEnvVar('REACT_APP_SHARE_LINKS_DOMAIN'),
    proxy: getEnvVar('REACT_APP_PROXY'),
    dontUseProxy: getEnvVar('REACT_APP_DONT_USE_PROXY'),
    notifications: getEnvVar('REACT_APP_NOTIFICATIONS_URL'),
  },

  analytics: {
    gaId: getEnvVar('REACT_APP_GA_ID'),
    gaBlogId: getEnvVar('REACT_APP_GA_BLOG_ID'),
    errorReportingKey: getEnvVar('REACT_APP_ANALYTICS_ERROR_REPORTING_WRITE_KEY'),
    cdpDataPlane: getEnvVar('REACT_APP_CDP_DATA_PLANE'),
  },
  vpnId: getEnvVar('REACT_APP_VPN_ID'),

  impact: {
    apiUrl: getEnvVar('REACT_APP_IMPACT_API'),
  },
  
  gsheet:{
    apiUrl: getEnvVar('REACT_APP_GSHEET_API'),
  }
};
