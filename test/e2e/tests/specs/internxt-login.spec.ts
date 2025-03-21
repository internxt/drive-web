import { expect, test } from '@playwright/test';
import fs from 'fs';
import { staticData } from '../helper/staticData';
import { LoginPage } from '../pages/loginPage';
const credentialsFile = './test/e2e/tests/specs/playwright/auth/credentials.json';

test.describe('internxt login', async () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test.beforeEach('Visiting Internxt', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL('http://localhost:3000/login');
  });

  test('TC1: Validate that the user can log in successfully', async ({ page }) => {
    const loginpage = new LoginPage(page);
    const credentialsData = JSON.parse(fs.readFileSync(credentialsFile, 'utf-8'));

    await loginpage.typeEmail(credentialsData.email);
    await loginpage.typePassword(credentialsData.password);

    const driveTitle = await loginpage.clickLogIn();
    expect(driveTitle).toEqual(staticData.driveTitle);
  });

  test('TC2: Validate that the user cant login with wrong credentials', async ({ page }) => {
    const loginpage = new LoginPage(page);
    const credentialsData = JSON.parse(fs.readFileSync(credentialsFile, 'utf-8'));

    await loginpage.typeEmail(credentialsData.email);
    await loginpage.typePassword(staticData.invalidPassword);
    const wrongLoginText = await loginpage.clickLoginWrongPass();
    expect(wrongLoginText).toEqual(staticData.wrongLoginWarning);
  });

  test('TC3: Validate that the user can go to the “forgot your password” page', async ({ page }) => {
    const loginpage = new LoginPage(page);

    const accountRecoveryText = await loginpage.clickOnForgotYourPassword();
    expect(accountRecoveryText).toEqual(staticData.accountRecovery);
  });

  test('TC4: Validate that the user can go to the “create account” page', async ({ page }) => {
    const loginpage = new LoginPage(page);

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
