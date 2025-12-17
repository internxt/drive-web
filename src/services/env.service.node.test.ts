import { describe, it, expect, beforeAll, vi } from 'vitest';
import dotenv from 'dotenv';
import * as path from 'path';
import envService from './env.service';

describe('Check that env variables are loaded correctly', () => {
  beforeAll(() => {
    const envPath = path.join(process.cwd(), '.env.example');

    const result = dotenv.config({ path: envPath });

    if (result.error) {
      console.error('Error loading .env.example:', result.error);
      throw result.error;
    }
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('When an env variable are requested, then their value is successfully returned', async () => {
    expect(envService.getVariable('stripePublicKey')).toBe(process.env.REACT_APP_STRIPE_PK);
    expect(envService.getVariable('stripeTestPublicKey')).toBe(process.env.REACT_APP_STRIPE_TEST_PK);

    expect(envService.getVariable('secret')).toBe(process.env.REACT_APP_CRYPTO_SECRET);
    expect(envService.getVariable('secret2')).toBe(process.env.REACT_APP_CRYPTO_SECRET2);

    expect(envService.getVariable('newApi')).toBe(process.env.REACT_APP_DRIVE_NEW_API_URL);
    expect(envService.getVariable('payments')).toBe(process.env.REACT_APP_PAYMENTS_API_URL);
    expect(envService.getVariable('location')).toBe(process.env.REACT_APP_LOCATION_API_URL);

    expect(envService.getVariable('authUrl')).toBe(process.env.REACT_APP_AUTH_URL);
    expect(envService.getVariable('buttonAuthUrl')).toBe(process.env.REACT_APP_BUTTON_AUTH_URL);

    expect(envService.getVariable('storjBridge')).toBe(process.env.REACT_APP_STORJ_BRIDGE);
    expect(envService.getVariable('segmentKey')).toBe(process.env.REACT_APP_SEGMENT_KEY);
    expect(envService.getVariable('intercomProviderKey')).toBe(process.env.REACT_APP_INTERCOM_PROVIDER_KEY);
    expect(envService.getVariable('recaptchaV3')).toBe(process.env.REACT_APP_RECAPTCHA_V3);
    expect(envService.getVariable('shareLinksDomain')).toBe(process.env.REACT_APP_SHARE_LINKS_DOMAIN);
    expect(envService.getVariable('proxy')).toBe(process.env.REACT_APP_PROXY);
    expect(envService.getVariable('dontUseProxy')).toBe(process.env.REACT_APP_DONT_USE_PROXY);
    expect(envService.getVariable('notifications')).toBe(process.env.REACT_APP_NOTIFICATIONS_URL);

    expect(envService.getVariable('gaId')).toBe(process.env.REACT_APP_GA_ID);
    expect(envService.getVariable('fbId')).toBe(process.env.REACT_APP_META_PIXEL);
    expect(envService.getVariable('gaBlogId')).toBe(process.env.REACT_APP_GA_BLOG_ID);
    expect(envService.getVariable('errorReportingKey')).toBe(process.env.REACT_APP_ANALYTICS_ERROR_REPORTING_WRITE_KEY);
    expect(envService.getVariable('cdpDataPlane')).toBe(process.env.REACT_APP_CDP_DATA_PLANE);

    expect(envService.getVariable('nodeEnv')).toBe(process.env.NODE_ENV);
    expect(envService.getVariable('generateSourceMap')).toBe(process.env.GENERATE_SOURCEMAP);
    expect(envService.getVariable('hostname')).toBe(process.env.REACT_APP_HOSTNAME);
    expect(envService.getVariable('websiteUrl')).toBe(process.env.REACT_APP_WEBSITE_URL);
    expect(envService.getVariable('baseUrl')).toBe(process.env.REACT_APP_BASE_URL);

    expect(envService.getVariable('vpnId')).toBe(process.env.REACT_APP_VPN_ID);
    expect(envService.getVariable('impactApiUrl')).toBe(process.env.REACT_APP_IMPACT_API);


  });

  it('When the endpoints variables are requested, then the value is actually an endpoint variable', async () => {
    const urlPattern = /^https?:\/\/.+/;

    expect(envService.getVariable('newApi')).toMatch(urlPattern);
    expect(envService.getVariable('payments')).toMatch(urlPattern);
    expect(envService.getVariable('websiteUrl')).toMatch(urlPattern);
    expect(envService.getVariable('notifications')).toMatch(urlPattern);
    expect(envService.getVariable('storjBridge')).toMatch(urlPattern);
    expect(envService.getVariable('impactApiUrl')).toMatch(urlPattern);
    expect(envService.getVariable('location')).toMatch(urlPattern);
  });
});
