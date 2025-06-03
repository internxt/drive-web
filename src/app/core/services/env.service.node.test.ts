import { describe, it, expect, beforeAll, vi } from 'vitest';
import dotenv from 'dotenv';
import * as path from 'path';

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
    const { envConfig } = await import('./env.service');

    expect(envConfig.stripe.publicKey).toBe(process.env.REACT_APP_STRIPE_PK);
    expect(envConfig.stripe.testPublicKey).toBe(process.env.REACT_APP_STRIPE_TEST_PK);

    expect(envConfig.crypto.secret).toBe(process.env.REACT_APP_CRYPTO_SECRET);
    expect(envConfig.crypto.secret2).toBe(process.env.REACT_APP_CRYPTO_SECRET2);
    expect(envConfig.crypto.magicIv).toBe(process.env.REACT_APP_MAGIC_IV);
    expect(envConfig.crypto.magicSalt).toBe(process.env.REACT_APP_MAGIC_SALT);

    expect(envConfig.api.api).toBe(process.env.REACT_APP_API_URL);
    expect(envConfig.api.newApi).toBe(process.env.REACT_APP_DRIVE_NEW_API_URL);
    expect(envConfig.api.payments).toBe(process.env.REACT_APP_PAYMENTS_API_URL);
    expect(envConfig.api.location).toBe(process.env.REACT_APP_LOCATION_API_URL);

    expect(envConfig.auth.authUrl).toBe(process.env.REACT_APP_AUTH_URL);
    expect(envConfig.auth.buttonAuthUrl).toBe(process.env.REACT_APP_BUTTON_AUTH_URL);

    expect(envConfig.services.storjBridge).toBe(process.env.REACT_APP_STORJ_BRIDGE);
    expect(envConfig.services.segmentKey).toBe(process.env.REACT_APP_SEGMENT_KEY);
    expect(envConfig.services.intercomProviderKey).toBe(process.env.REACT_APP_INTERCOM_PROVIDER_KEY);
    expect(envConfig.services.sentryDsn).toBe(process.env.REACT_APP_SENTRY_DSN);
    expect(envConfig.services.recaptchaV3).toBe(process.env.REACT_APP_RECAPTCHA_V3);
    expect(envConfig.services.avatarUrl).toBe(process.env.REACT_APP_AVATAR_URL);
    expect(envConfig.services.shareLinksDomain).toBe(process.env.REACT_APP_SHARE_LINKS_DOMAIN);
    expect(envConfig.services.proxy).toBe(process.env.REACT_APP_PROXY);
    expect(envConfig.services.dontUseProxy).toBe(process.env.REACT_APP_DONT_USE_PROXY);
    expect(envConfig.services.notifications).toBe(process.env.REACT_APP_NOTIFICATIONS_URL);

    expect(envConfig.analytics.gaId).toBe(process.env.REACT_APP_GA_ID);
    expect(envConfig.analytics.gaBlogId).toBe(process.env.REACT_APP_GA_BLOG_ID);
    expect(envConfig.analytics.errorReportingKey).toBe(process.env.REACT_APP_ANALYTICS_ERROR_REPORTING_WRITE_KEY);
    expect(envConfig.analytics.cdpDataPlane).toBe(process.env.REACT_APP_CDP_DATA_PLANE);

    expect(envConfig.app.nodeEnv).toBe(process.env.NODE_ENV);
    expect(envConfig.app.fastRefresh).toBe(process.env.FAST_REFRESH);
    expect(envConfig.app.debug).toBe(process.env.REACT_APP_DEBUG);
    expect(envConfig.app.generateSourceMap).toBe(process.env.GENERATE_SOURCEMAP);
    expect(envConfig.app.hostname).toBe(process.env.REACT_APP_HOSTNAME);
    expect(envConfig.app.websiteUrl).toBe(process.env.REACT_APP_WEBSITE_URL);
    expect(envConfig.app.baseUrl).toBe(process.env.REACT_APP_BASE_URL);

    expect(envConfig.vpnId).toBe(process.env.REACT_APP_VPN_ID);
    expect(envConfig.impact.apiUrl).toBe(process.env.REACT_APP_IMPACT_API);
  });

  it('When the endpoints variables are requested, then the value is actually an endpoint variable', async () => {
    const { envConfig } = await import('./env.service');

    const urlPattern = /^https?:\/\/.+/;

    expect(envConfig.api.api).toMatch(urlPattern);
    expect(envConfig.api.newApi).toMatch(urlPattern);
    expect(envConfig.api.payments).toMatch(urlPattern);
    expect(envConfig.app.websiteUrl).toMatch(urlPattern);
    expect(envConfig.services.notifications).toMatch(urlPattern);
    expect(envConfig.services.storjBridge).toMatch(urlPattern);
    expect(envConfig.impact.apiUrl).toMatch(urlPattern);
    expect(envConfig.api.location).toMatch(urlPattern);
  });
});
