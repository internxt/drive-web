import { expect, test } from '@playwright/test';
import { staticData } from '../helper/staticData';
import { LoginPage } from '../pages/loginPage';
import { getLoggedUser, getUserCredentials } from '../helper/getUser';
const BASE_API_URL = process.env.REACT_APP_DRIVE_NEW_API_URL;

const credentialsFile = getUserCredentials();
const user = getLoggedUser();
const invalidEmail = 'invalid@internxt.com';

const mockLoginCall = async (route, request) => {
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      hasKeys: true,
      sKey: '53616c7465645f5f2aa5386bc0b15f6f69a733acdd46a6551dc004f6c1cb6352390535de3ec17e9b96da7de984e5d27e79ad04a88a2cc8c6315f03dc0b0d174c',
      tfa: false,
      hasKyberKeys: true,
      hasEccKeys: true,
    }),
  });
};

const mockAccessCall = async (route, request) => {
  const { email } = request.postDataJSON();

  if (invalidEmail === email) {
    return route.fulfill({
      status: 400,
      body: JSON.stringify({ message: 'Wrong login credentials' }),
    });
  }

  await route.fulfill({
    status: 200,
    body: JSON.stringify({
      user: user.user,
      token: user.token,
      newToken: user.newToken,
      userTeam: user.userTeam,
    }),
  });
};

test.describe('internxt login', async () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test.beforeEach('Visiting Internxt', async ({ page }) => {
    await page.route(`${BASE_API_URL}/auth/login`, mockLoginCall);
    await page.route(`${BASE_API_URL}/auth/login/access`, mockAccessCall);

    await page.goto('/');
    await expect(page).toHaveURL('http://localhost:3000/login');
  });

  test('TC1: Validate that the user can log in successfully', async ({ page }) => {
    const loginpage = new LoginPage(page);

    await loginpage.typeEmail(credentialsFile.email);
    await loginpage.typePassword(credentialsFile.password);

    const driveTitle = await loginpage.clickLogIn();
    expect(driveTitle).toEqual(staticData.driveTitle);
  });

  test('TC2: Validate that the user cant login with wrong credentials', async ({ page }) => {
    const loginpage = new LoginPage(page);

    await loginpage.typeEmail(invalidEmail);
    await loginpage.typePassword(staticData.invalidPassword);
    const wrongLoginText = await loginpage.clickLoginWrongPass();
    expect(wrongLoginText).toEqual(staticData.wrongLoginWarning);
  });

  test('TC3: Validate that the user can go to the “forgot your password” page', async ({ page }) => {
    const loginpage = new LoginPage(page);
    await page.waitForLoadState('domcontentloaded');

    const accountRecoveryText = await loginpage.clickOnForgotYourPassword();
    expect(accountRecoveryText).toEqual(staticData.accountRecovery);
  });

  test('TC4: Validate that the user can go to the “create account” page', async ({ page }) => {
    const loginpage = new LoginPage(page);
    await page.waitForLoadState('domcontentloaded');

    const createAccountHeader = await loginpage.clickOnCreateAccount();
    expect(createAccountHeader).toEqual(staticData.createAccountText);
  });

  test('TC5: Validate that the user can go to the “terms and conditions” page', async ({ page, context }) => {
    const loginpage = new LoginPage(page);

    const { termsAndConditionsText, termsOfServiceTitle } = await loginpage.clickOnTermsAndConditions(context);
    expect(termsAndConditionsText).toEqual(staticData.termsAndConditionsLinkText);
    expect(termsOfServiceTitle).toEqual(staticData.termsOfServiceTitle);
  });

  test('TC6: Validate that the user can go to the “need help” page', async ({ page, context }) => {
    const loginpage = new LoginPage(page);

    const { needHelpText, needHelpPageTitle } = await loginpage.clickOnNeedHelp(context);
    expect(needHelpText).toEqual(staticData.needHelpLinkText);
    expect(needHelpPageTitle).toEqual(staticData.needHelpTitle);
  });
});
