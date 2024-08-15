import { test, expect } from '@playwright/test';
import { loginPage } from '../pages/loginPage';
import { staticData } from '../helper/staticData';

test.describe('internxt login', async () => {
  test.beforeEach('Visiting Internxt', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/.*internxt/);
  });
  test.use({ storageState: { cookies: [], origins: [] } });
  test('TC1: Validate that the user can log in successfully', async ({ page }) => {
    const loginpage = new loginPage(page);

    await loginpage.typeEmail(staticData.email);
    await loginpage.typePassword(staticData.password);
    const driveTitle = await loginpage.clickLogIn(staticData.password);
    expect(driveTitle).toEqual(staticData.driveTitle);
  });
  test.use({ storageState: { cookies: [], origins: [] } });
  test('TC2: Validate that the user cant login with wrong credentials', async ({ page }) => {
    const loginpage = new loginPage(page);
    await loginpage.typeEmail(staticData.email);
    await loginpage.typePassword(staticData.invalidPassword);
    const wrongLoginText = await loginpage.clickLogIn(staticData.invalidPassword);
    expect(wrongLoginText).toEqual(staticData.wrongLoginWarning);
  });
  test.use({ storageState: { cookies: [], origins: [] } });
  test('TC3: Validate that the user can go to the “forgot your password” page', async ({ page }) => {
    const loginpage = new loginPage(page);

    const accountRecoveryText = await loginpage.clickOnForgotYourPassword();
    expect(accountRecoveryText).toEqual(staticData.accountRecovery);
  });
  test.use({ storageState: { cookies: [], origins: [] } });
  test('TC4: Validate that the user can go to the “create account” page', async ({ page }) => {
    const loginpage = new loginPage(page);

    const { dontHaveAccountText, createAccountText, createAccountTitle } = await loginpage.clickOnCreateAccount();
    expect(dontHaveAccountText).toEqual(staticData.dontHaveAccountText);
    expect(createAccountText).toEqual(staticData.createAccountText);
    expect(createAccountTitle).toEqual(staticData.createAccountText);
  });

  test.use({ storageState: { cookies: [], origins: [] } });
  test('TC5: Validate that the user can go to the “terms and conditions” page', async ({ page, context }) => {
    const loginpage = new loginPage(page);

    const { termsAndConditionsText, termsOfServiceTitle } = await loginpage.clickOnTermsAndConditions(context);
    expect(termsAndConditionsText).toEqual(staticData.termsAndConditions);
    expect(termsOfServiceTitle).toEqual(staticData.termsOfServiceTitle);
  });

  test.use({ storageState: { cookies: [], origins: [] } });
  test('TC6: Validate that the user can go to the “need help” page', async ({ page, context }) => {
    const loginpage = new loginPage(page);

    const { needHelpText, needHelpPageTitle } = await loginpage.clickOnNeedHelp(context);
    expect(needHelpText).toEqual(staticData.needHelpLinkText);
    expect(needHelpPageTitle).toEqual(staticData.needHelpTitle);
  });
});
