import { test, expect } from '@playwright/test';
import { expectedWrongLoginText, loginPage } from '../../pages/loginPage';
import { staticData } from '../../helper/scaticData';
import { accountRecoveryText } from '../../pages/loginPage';
const email = staticData.email;
const pass = staticData.password;
const invalidPass = staticData.invalidPassword;
const expectedAccountRecoveryText = staticData.accountRecovery;
const wrongLoginText = staticData.wrongLoginWarning;
const dontHaveAccountText = staticData.dontHaveAccountText;
const createAccountText = staticData.createAccountText;

test.describe('internxt login', async () => {
  test.beforeEach('Visiting Internxt', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/.*internxt/);
  });
  test('TC1: Validate that the user can log in successfully', async ({ page }) => {
    const loginpage = new loginPage(page);

    await loginpage.typeEmail(email);
    await loginpage.typePassword(pass);
    await loginpage.clickLogIn(pass);
  });
  test('TC2: Validate that the user cant login with wrong credentials', async ({ page }) => {
    const loginpage = new loginPage(page);
    await loginpage.typeEmail(email);
    await loginpage.typePassword(invalidPass);
    await loginpage.clickLogIn(invalidPass);
    expect(wrongLoginText).toEqual(expectedWrongLoginText);
  });
  test('TC3: Validate that the user can go to the “forgot your password” page', async ({ page }) => {
    const loginpage = new loginPage(page);

    await loginpage.clickOnForgotYourPassword();
    expect(accountRecoveryText).toEqual(expectedAccountRecoveryText);
  });
  test('TC4: Validate that the user can go to the “create account” page', async ({ page }) => {
    const loginpage = new loginPage(page);

    const { expectedDontHaveAccountText, expectedCreateAccountText, expectedCreateAccountTitle } =
      await loginpage.clickOnCreateAccount();
    expect(expectedDontHaveAccountText).toEqual(dontHaveAccountText);
    expect(expectedCreateAccountText).toEqual(createAccountText);
    expect(expectedCreateAccountTitle).toEqual(createAccountText);
  });
});
