function isProduction(): boolean {
  const runtimeMode = (import.meta.env.MODE ?? '').toLowerCase();
  const nodeEnv = (import.meta.env.REACT_APP_NODE_ENV ?? '').toLowerCase();

  const nonProdValues = ['staging', 'development', 'dev'];

  if (nonProdValues.includes(runtimeMode) || nonProdValues.includes(nodeEnv)) {
    return false;
  }

  return runtimeMode === 'production' || nodeEnv === 'production';
}

const envService = {
  isProduction,
  getVariable,
};
const variableList = {
  secret: 'REACT_APP_CRYPTO_SECRET',
  secret2: 'REACT_APP_CRYPTO_SECRET2',
  magicIv: 'REACT_APP_MAGIC_IV',
  magicSalt: 'REACT_APP_MAGIC_SALT',
  nodeEnv: 'NODE_ENV',
  mode: 'MODE',
  debug: 'REACT_APP_DEBUG',
  generateSourceMap: 'GENERATE_SOURCEMAP',
  hostname: 'REACT_APP_HOSTNAME',
  websiteUrl: 'REACT_APP_WEBSITE_URL',
  baseUrl: 'REACT_APP_BASE_URL',
  stripePublicKey: 'REACT_APP_STRIPE_PK',
  stripeTestPublicKey: 'REACT_APP_STRIPE_TEST_PK',
  newApi: 'REACT_APP_DRIVE_NEW_API_URL',
  payments: 'REACT_APP_PAYMENTS_API_URL',
  location: 'REACT_APP_LOCATION_API_URL',
  authUrl: 'REACT_APP_AUTH_URL',
  buttonAuthUrl: 'REACT_APP_BUTTON_AUTH_URL',
  storjBridge: 'REACT_APP_STORJ_BRIDGE',
  segmentKey: 'REACT_APP_SEGMENT_KEY',
  intercomProviderKey: 'REACT_APP_INTERCOM_PROVIDER_KEY',
  sentryDsn: 'REACT_APP_SENTRY_DSN',
  recaptchaV3: 'REACT_APP_RECAPTCHA_V3',
  shareLinksDomain: 'REACT_APP_SHARE_LINKS_DOMAIN',
  proxy: 'REACT_APP_PROXY',
  dontUseProxy: 'REACT_APP_DONT_USE_PROXY',
  notifications: 'REACT_APP_NOTIFICATIONS_URL',
  gaId: 'REACT_APP_GA_ID',
  gaBlogId: 'REACT_APP_GA_BLOG_ID',
  errorReportingKey: 'REACT_APP_ANALYTICS_ERROR_REPORTING_WRITE_KEY',
  cdpDataPlane: 'REACT_APP_CDP_DATA_PLANE',
  vpnId: 'REACT_APP_VPN_ID',
  impactApiUrl: 'REACT_APP_IMPACT_API',
};

function getVariable(variable: keyof typeof variableList): string {
  const envKey = variableList[variable];
  if (!envKey) {
    throw new Error(`Unknown variable name: "${variable}"`);
  }
  const value = import.meta.env[envKey];
  return value;
}

export default envService;
