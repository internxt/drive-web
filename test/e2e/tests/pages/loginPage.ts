import { Locator, Page, expect } from '@playwright/test';
import { Context } from 'vm';

export class LoginPage {
  page: Page;
  private loginTitle: Locator;
  private emailInput: Locator;
  private passwordInput: Locator;
  private loginButton: Locator;
  private loginButtonText: Locator;
  private forgotPassword: Locator;
  private dontHaveAccountText: Locator;
  private createAccount: Locator;
  private termsAndConditions: Locator;
  private needHelp: Locator;
  private wrongCredentials: Locator;
  //drive
  private driveTitle: Locator;
  //accountRecovery
  private accountRecoveryTitle: Locator;
  //SignUp
  private createAccounTitle: Locator;

  constructor(page: Page) {
    this.page = page;
    this.loginTitle = this.page.getByRole('heading', { name: 'Log in' });
    this.emailInput = this.page.getByPlaceholder('Email', { exact: true });
    this.passwordInput = this.page.getByPlaceholder('Password', { exact: true });
    this.loginButton = this.page.getByRole('button', { name: 'Log in' });
    this.loginButtonText = this.page.locator('[data-cy="loginButton"] div');
    this.forgotPassword = this.page.getByText('Forgot your password?');
    this.dontHaveAccountText = this.page.getByText(/Don.t have an Internxt account\?/).first();
    this.createAccount = this.page.getByRole('link', { name: 'Create account' });
    this.termsAndConditions = this.page.getByRole('link', { name: 'Terms and conditions' });
    this.needHelp = this.page.getByRole('link', { name: 'Need help?' });
    this.wrongCredentials = this.page.locator('[class="flex flex-row items-start pt-1"] span');
    //drive
    this.driveTitle = this.page.locator('span[class="max-w-sm flex-1 cursor-pointer truncate undefined"]');
    //account recovery
    this.accountRecoveryTitle = this.page.locator(
      'h1[class="text-3xl font-medium text-gray-100"]:has-text("Account recovery")',
    );
    //Sign Up
    this.createAccounTitle = this.page.getByRole('heading', { name: 'Create account' });
    // terms of service
  }

  async typeEmail(user: string | any) {
    await expect(this.emailInput).toBeVisible();
    const emailPlaceholder = await this.emailInput.getAttribute('placeholder');
    expect(emailPlaceholder).toEqual('Email');
    await this.emailInput.fill(user);
  }
  async typePassword(password: string | any) {
    const passPlaceholder = await this.passwordInput.getAttribute('placeholder');
    expect(passPlaceholder).toEqual('Password');
    await this.passwordInput.fill(password);
  }
  async clickLogIn() {
    await expect(this.loginButton).toBeVisible();
    const loginButtonText = await this.loginButtonText.textContent();
    expect(loginButtonText).toEqual('Log in');
    await this.loginButton.click();
    const driveTitle = await this.driveTitle.textContent();
    return driveTitle;
  }

  async clickLoginWrongPass() {
    await expect(this.loginButton).toBeVisible();
    const loginButtonText = await this.loginButtonText.textContent();
    expect(loginButtonText).toEqual('Log in');
    await this.loginButton.click();
    await this.wrongCredentials.waitFor({ state: 'visible' });
    await expect(this.wrongCredentials).toBeEnabled();
    const wrongLoginText = await this.wrongCredentials.textContent();
    return wrongLoginText;
  }

  async clickOnForgotYourPassword() {
    await expect(this.loginTitle).toBeVisible();
    await expect(this.forgotPassword).toBeVisible();
    await expect(this.forgotPassword).toBeEnabled();
    await this.forgotPassword.click();
    await expect(this.accountRecoveryTitle).toBeVisible();
    const accountRecoveryText = await this.accountRecoveryTitle.textContent({ timeout: 3000 });
    return accountRecoveryText;
  }

  async clickOnCreateAccount() {
    await expect(this.loginTitle).toBeVisible({
      timeout: 10000,
    });
    const dontHaveAccountText = await this.dontHaveAccountText.textContent();
    const createAccountText = await this.createAccount.textContent({
      timeout: 10000,
    });
    expect(dontHaveAccountText).toEqual("Don't have an Internxt account?");
    expect(createAccountText).toEqual('Create account');
    await expect(this.createAccount).toBeEnabled();
    await this.createAccount.click();
    await expect(this.createAccounTitle).toBeVisible({
      timeout: 10000,
    });
    const createAccountHeader = this.createAccounTitle.textContent();

    return createAccountHeader;
  }

  async clickOnTermsAndConditions(context: Context) {
    const pagePromise = context.waitForEvent('page');
    await expect(this.termsAndConditions).toBeVisible();
    const termsAndConditionsText = await this.termsAndConditions.textContent();
    await this.termsAndConditions.click();

    const newPage = await pagePromise;
    const termsOfServiceTitle = await newPage.locator('h1').textContent();
    return { termsAndConditionsText, termsOfServiceTitle };
  }

  async clickOnNeedHelp(context: Context) {
    const pagePromise = context.waitForEvent('page');
    await expect(this.needHelp).toBeVisible();
    const needHelpText = await this.needHelp.textContent();
    await this.needHelp.click();

    const newPage = await pagePromise;
    const needHelpPageTitle = await newPage.locator('h1').textContent();
    return { needHelpText, needHelpPageTitle };
  }
}
