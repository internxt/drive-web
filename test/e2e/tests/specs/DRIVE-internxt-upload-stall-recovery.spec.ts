import { expect, Page, test } from '@playwright/test';
import { getUserCredentials } from '../helper/getUser';
import { staticData } from '../helper/staticData';
import { DrivePage } from '../pages/drivePage';
import { LoginPage } from '../pages/loginPage';

const STALL_DETECTION_TIMEOUT = 75000;
const STALLED_ATTEMPT_LOG = 'Attempt 1 of 3 failed: Error: Upload stalled';
const LOCAL_ORIGIN = 'http://localhost:3000';

const textFile = (name: string) => ({ name, mimeType: 'text/plain', buffer: Buffer.from(`content of ${name}`) });

const API_ORIGINS = [
  process.env.REACT_APP_DRIVE_NEW_API_URL,
  process.env.REACT_APP_API_URL,
  process.env.REACT_APP_PAYMENTS_API_URL,
  process.env.REACT_APP_STORJ_BRIDGE,
].map((apiUrl) => new URL(apiUrl as string).origin);

const isInternxtApi = (url: URL) => API_ORIGINS.includes(url.origin);
const isStorageHost = (url: URL) => !url.hostname.includes('internxt') && url.hostname !== 'localhost';

const allowApiCallsFromLocalhost = (page: Page) =>
  page.route(isInternxtApi, async (route, request) => {
    const corsHeaders = { 'access-control-allow-origin': LOCAL_ORIGIN, 'access-control-allow-headers': '*' };
    const isPreflight = request.method() === 'OPTIONS';
    if (isPreflight) return route.fulfill({ status: 204, headers: corsHeaders });

    const response = await route.fetch();
    return route.fulfill({ response, headers: { ...response.headers(), ...corsHeaders } });
  });

const holdFirstStoragePut = async (page: Page) => {
  let putCount = 0;

  await page.route(isStorageHost, (route, request) => {
    const isPut = request.method() === 'PUT';
    if (!isPut) return route.continue();

    putCount++;
    const isFirstPut = putCount === 1;
    if (!isFirstPut) return route.continue();
  });

  return { putCount: () => putCount };
};

const watchForStalledAttempt = (page: Page) => {
  let hasStalledAttempt = false;

  page.on('console', (message) => {
    const isStalledAttempt = message.type() === 'warning' && message.text().startsWith(STALLED_ATTEMPT_LOG);
    hasStalledAttempt ||= isStalledAttempt;
  });

  return { hasStalledAttempt: () => hasStalledAttempt };
};

const logIn = async (page: Page) => {
  const credentials = getUserCredentials();
  const loginPage = new LoginPage(page);

  await page.goto(staticData.driveURL);
  await loginPage.typeEmail(credentials.email);
  await loginPage.typePassword(credentials.password);
  expect(await loginPage.clickLogIn()).toEqual(staticData.driveTitle);
};

test.describe('Internxt upload stall recovery', () => {
  test.use({ storageState: { cookies: [], origins: [] } });
  test.setTimeout(STALL_DETECTION_TIMEOUT + 60000);

  test.beforeEach('Logging in', async ({ page }) => {
    await allowApiCallsFromLocalhost(page);
    await logIn(page);
  });

  test.afterEach(async ({ page }) => {
    await page.unrouteAll({ behavior: 'ignoreErrors' });
  });

  test('TC1: Validate that an upload whose storage connection goes silent is retried and completes', async ({
    page,
  }) => {
    const drivePage = new DrivePage(page);
    const storageHost = await holdFirstStoragePut(page);
    const stallWatcher = watchForStalledAttempt(page);

    await drivePage.uploadFiles([textFile(`stalled-upload-${Date.now()}.txt`)]);
    await drivePage.expectUploadWidgetStatus(staticData.uploadInProgress, 10000);
    await expect.poll(storageHost.putCount, { timeout: 15000 }).toBe(1);

    await expect.poll(stallWatcher.hasStalledAttempt, { timeout: STALL_DETECTION_TIMEOUT }).toBe(true);
    await expect.poll(storageHost.putCount, { timeout: 15000 }).toBe(2);
    await drivePage.expectUploadWidgetStatus(staticData.uploadsFinished, 30000);
  });
});
