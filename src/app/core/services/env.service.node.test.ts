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

    vi.resetModules();
  });

  it('When an env variable are requested, then their value is successfully returned', async () => {
    expect(envService.getVaribale('stripePublicKey')).toBe(process.env.REACT_APP_STRIPE_PK);
    expect(envService.getVaribale('stripeTestPublicKey')).toBe(process.env.REACT_APP_STRIPE_TEST_PK);

    expect(envService.getVaribale('secret')).toBe(process.env.REACT_APP_CRYPTO_SECRET);
    expect(envService.getVaribale('secret2')).toBe(process.env.REACT_APP_CRYPTO_SECRET2);
    expect(envService.getVaribale('magicIv')).toBe(process.env.REACT_APP_MAGIC_IV);
    expect(envService.getVaribale('magicSalt')).toBe(process.env.REACT_APP_MAGIC_SALT);

    expect(envService.getVaribale('api')).toBe(process.env.REACT_APP_API_URL);
    expect(envService.getVaribale('newApi')).toBe(process.env.REACT_APP_DRIVE_NEW_API_URL);
    expect(envService.getVaribale('payments')).toBe(process.env.REACT_APP_PAYMENTS_API_URL);
    expect(envService.getVaribale('location')).toBe(process.env.REACT_APP_LOCATION_API_URL);

    expect(envService.getVaribale('authUrl')).toBe(process.env.REACT_APP_AUTH_URL);
    expect(envService.getVaribale('buttonAuthUrl')).toBe(process.env.REACT_APP_BUTTON_AUTH_URL);

    expect(envService.getVaribale('storjBridge')).toBe(process.env.REACT_APP_STORJ_BRIDGE);
    expect(envService.getVaribale('segmentKey')).toBe(process.env.REACT_APP_SEGMENT_KEY);
    expect(envService.getVaribale('intercomProviderKey')).toBe(process.env.REACT_APP_INTERCOM_PROVIDER_KEY);
    expect(envService.getVaribale('sentryDsn')).toBe(process.env.REACT_APP_SENTRY_DSN);
    expect(envService.getVaribale('recaptchaV3')).toBe(process.env.REACT_APP_RECAPTCHA_V3);
    expect(envService.getVaribale('avatarUrl')).toBe(process.env.REACT_APP_AVATAR_URL);
    expect(envService.getVaribale('shareLinksDomain')).toBe(process.env.REACT_APP_SHARE_LINKS_DOMAIN);
    expect(envService.getVaribale('proxy')).toBe(process.env.REACT_APP_PROXY);
    expect(envService.getVaribale('dontUseProxy')).toBe(process.env.REACT_APP_DONT_USE_PROXY);
    expect(envService.getVaribale('notifications')).toBe(process.env.REACT_APP_NOTIFICATIONS_URL);

    expect(envService.getVaribale('gaId')).toBe(process.env.REACT_APP_GA_ID);
    expect(envService.getVaribale('gaBlogId')).toBe(process.env.REACT_APP_GA_BLOG_ID);
    expect(envService.getVaribale('errorReportingKey')).toBe(process.env.REACT_APP_ANALYTICS_ERROR_REPORTING_WRITE_KEY);
    expect(envService.getVaribale('cdpDataPlane')).toBe(process.env.REACT_APP_CDP_DATA_PLANE);

    expect(envService.getVaribale('nodeEnv')).toBe(process.env.NODE_ENV);
    expect(envService.getVaribale('generateSourceMap')).toBe(process.env.GENERATE_SOURCEMAP);
    expect(envService.getVaribale('hostname')).toBe(process.env.REACT_APP_HOSTNAME);
    expect(envService.getVaribale('websiteUrl')).toBe(process.env.REACT_APP_WEBSITE_URL);
    expect(envService.getVaribale('baseUrl')).toBe(process.env.REACT_APP_BASE_URL);

    expect(envService.getVaribale('vpnId')).toBe(process.env.REACT_APP_VPN_ID);
    expect(envService.getVaribale('impactApiUrl')).toBe(process.env.REACT_APP_IMPACT_API);
  });

  it('When the endpoints variables are requested, then the value is actually an endpoint variable', async () => {
    const urlPattern = /^https?:\/\/.+/;

    expect(envService.getVaribale('api')).toMatch(urlPattern);
    expect(envService.getVaribale('newApi')).toMatch(urlPattern);
    expect(envService.getVaribale('payments')).toMatch(urlPattern);
    expect(envService.getVaribale('websiteUrl')).toMatch(urlPattern);
    expect(envService.getVaribale('notifications')).toMatch(urlPattern);
    expect(envService.getVaribale('storjBridge')).toMatch(urlPattern);
    expect(envService.getVaribale('impactApiUrl')).toMatch(urlPattern);
    expect(envService.getVaribale('location')).toMatch(urlPattern);
  });
});
