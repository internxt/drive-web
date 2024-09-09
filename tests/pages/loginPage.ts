import { Page, Locator, expect } from '@playwright/test';
import { Context } from 'vm';

export class loginPage {
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
  //terms and conditions
  private termsOfService: Locator;

  constructor(page: Page) {
    this.page = page;
    this.loginTitle = this.page.getByRole('heading', { level: 1 });
    this.emailInput = this.page.getByPlaceholder('Email', { exact: true });
    this.passwordInput = this.page.getByPlaceholder('Password', { exact: true });
    this.loginButton = this.page.getByRole('button', { name: 'Log in' });
    this.loginButtonText = this.page.locator('[data-cy="loginButton"] div');
    this.forgotPassword = this.page.getByText('Forgot your password?');
    this.dontHaveAccountText = this.page.getByText("Don't have an account?");
    this.createAccount = this.page.getByText('Create account');
    this.termsAndConditions = this.page.getByRole('link', { name: 'Terms and conditions' });
    this.needHelp = this.page.getByRole('link', { name: 'Need help?' });
    this.wrongCredentials = this.page.getByText('Wrong login credentials');
    //drive
    this.driveTitle = this.page.locator('[title="Drive"]');
    //account recovery
    this.accountRecoveryTitle = this.page.getByRole('heading', { level: 1 });
    //Sign Up
    this.createAccounTitle = this.page.getByRole('heading', { level: 1 });
    // terms of service
  }

  async typeEmail(user: string | any) {
    await this.loginTitle.waitFor({ state: 'visible' });
    const emailPlaceholder = await this.emailInput.getAttribute('placeholder');
    expect(emailPlaceholder).toEqual('Email');
    await this.emailInput.fill(user);
  }
  async typePassword(password: string | any) {
    const passPlaceholder = await this.passwordInput.getAttribute('placeholder');
    expect(passPlaceholder).toEqual('Password');
    await this.passwordInput.fill(password);
  }
  async clickLogIn(password: string | any) {
    if (password === 'test123.') {
      const loginButtonText = await this.loginButtonText.textContent();
      expect(loginButtonText).toEqual('Log in');
      await this.loginButton.click();
      await this.driveTitle.waitFor();
      const driveTitle = await this.driveTitle.textContent();
      return driveTitle;
    } else {
      await this.loginButton.click();
      await this.wrongCredentials.waitFor();
      const wrongLoginText = await this.wrongCredentials.textContent();
      return wrongLoginText;
    }
  }
  async clickOnForgotYourPassword() {
    await this.loginTitle.waitFor({ state: 'visible' });
    await this.forgotPassword.click();
    await this.accountRecoveryTitle.waitFor({ state: 'visible' });
    const accountRecoveryText = await this.accountRecoveryTitle.textContent();
    return accountRecoveryText;
  }

  async clickOnCreateAccount() {
    await this.loginTitle.waitFor({ state: 'visible' });
    const dontHaveAccountText = await this.dontHaveAccountText.textContent();
    const createAccountText = await this.createAccount.textContent();
    await this.createAccount.click();
    await this.createAccounTitle.waitFor({ state: 'visible', timeout: 3000 });
    const createAccountTitle = await this.createAccounTitle.textContent();

    return { dontHaveAccountText, createAccountText, createAccountTitle };
  }

  async clickOnTermsAndConditions(context: Context) {
    const pagePromise = context.waitForEvent('page');
    await this.termsAndConditions.waitFor({ state: 'visible' });
    const termsAndConditionsText = await this.termsAndConditions.textContent();
    await this.termsAndConditions.click();

    const newPage = await pagePromise;
    const termsOfServiceTitle = await newPage.locator('h1').textContent();
    return { termsAndConditionsText, termsOfServiceTitle };
  }

  async clickOnNeedHelp(context: Context) {
    const pagePromise = context.waitForEvent('page');
    await this.needHelp.waitFor({ state: 'visible' });
    const needHelpText = await this.needHelp.textContent();
    await this.needHelp.click();

    const newPage = await pagePromise;
    const needHelpPageTitle = await newPage.locator('h1').textContent();
    return { needHelpText, needHelpPageTitle };
  }
}
