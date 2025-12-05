export function checkIsProduction(mode: string | undefined, nodeEnv: string | undefined): boolean {
  const runtimeMode = (mode ?? '').toLowerCase();
  const reactNodeEnv = (nodeEnv ?? '').toLowerCase();

  const nonProdValues = new Set(['staging', 'development']);

  if (nonProdValues.has(runtimeMode) || nonProdValues.has(reactNodeEnv)) {
    return false;
  }

  return runtimeMode === 'production' || reactNodeEnv === 'production';
}

function isProduction(): boolean {
  return checkIsProduction(import.meta.env.MODE, import.meta.env.REACT_APP_NODE_ENV);
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
  recaptchaV3: 'REACT_APP_RECAPTCHA_V3',
  shareLinksDomain: 'REACT_APP_SHARE_LINKS_DOMAIN',
  proxy: 'REACT_APP_PROXY',
  dontUseProxy: 'REACT_APP_DONT_USE_PROXY',
  notifications: 'REACT_APP_NOTIFICATIONS_URL',
  gaId: 'REACT_APP_GA_ID',
  gaConversionTag: 'REACT_APP_GA_CONVERSION_TAG',
  gaBlogId: 'REACT_APP_GA_BLOG_ID',
  errorReportingKey: 'REACT_APP_ANALYTICS_ERROR_REPORTING_WRITE_KEY',
  cdpDataPlane: 'REACT_APP_CDP_DATA_PLANE',
  vpnId: 'REACT_APP_VPN_ID',
  impactApiUrl: 'REACT_APP_IMPACT_API',
  dontRedirect: 'REACT_APP_DONT_REDIRECT',
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
