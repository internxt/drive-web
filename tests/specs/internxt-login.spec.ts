import { test, expect } from '@playwright/test';
import { loginPage } from '../pages/loginPage';
import { staticData } from '../helper/staticData';
const fs = require('fs');
const credentialsFile = './tests/specs/playwright/.auth/credentials.json';

test.describe('internxt login', async () => {
  const credentialsData = JSON.parse(fs.readFileSync(credentialsFile, 'utf-8'));
  test.use({ storageState: { cookies: [], origins: [] } });

  test.beforeEach('Visiting Internxt', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/.*internxt/);
  });

  test('TC1: Validate that the user can log in successfully', async ({ page }) => {
    const loginpage = new loginPage(page);

    await loginpage.typeEmail(credentialsData.email);
    await loginpage.typePassword(credentialsData.password);
    const driveTitle = await loginpage.clickLogIn();
    expect(driveTitle).toEqual(staticData.driveTitle);
  });

  test('TC2: Validate that the user cant login with wrong credentials', async ({ page }) => {
    const loginpage = new loginPage(page);
    await loginpage.typeEmail(credentialsData.email);
    await loginpage.typePassword(staticData.invalidPassword);
    const wrongLoginText = await loginpage.clickLoginWrongPass();
    expect(wrongLoginText).toEqual(staticData.wrongLoginWarning);
  });

  test('TC3: Validate that the user can go to the “forgot your password” page', async ({ page }) => {
    const loginpage = new loginPage(page);

    const accountRecoveryText = await loginpage.clickOnForgotYourPassword();
    expect(accountRecoveryText).toEqual(staticData.accountRecovery);
  });

  test('TC4: Validate that the user can go to the “create account” page', async ({ page }) => {
    const loginpage = new loginPage(page);

    const { dontHaveAccountText, createAccountText, createAccountTitle } = await loginpage.clickOnCreateAccount();
    expect(dontHaveAccountText).toEqual(staticData.dontHaveAccountText);
    expect(createAccountText).toEqual(staticData.createAccountText);
    expect(createAccountTitle).toEqual(staticData.createAccountText);
  });

  test('TC5: Validate that the user can go to the “terms and conditions” page', async ({ page, context }) => {
    const loginpage = new loginPage(page);

    const { termsAndConditionsText, termsOfServiceTitle } = await loginpage.clickOnTermsAndConditions(context);
    expect(termsAndConditionsText).toEqual(staticData.termsAndConditionsLinkText);
    expect(termsOfServiceTitle).toEqual(staticData.termsOfServiceTitle);
  });

  test('TC6: Validate that the user can go to the “need help” page', async ({ page, context }) => {
    const loginpage = new loginPage(page);

    const { needHelpText, needHelpPageTitle } = await loginpage.clickOnNeedHelp(context);
    expect(needHelpText).toEqual(staticData.needHelpLinkText);
    expect(needHelpPageTitle).toEqual(staticData.needHelpTitle);
  });
});
