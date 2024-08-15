import { Page, Locator, expect } from '@playwright/test';
import { basePage } from './basePage';
import { loginLocators } from '../locators/loginLocators';
import { driveLocators } from '../locators/driveLocators';
import { signUpLocators } from '../locators/signUpLocators';
import { accountRecoveryLocators } from '../locators/accountRecoveryLocators';
import { termsAndConditionsLocators } from '../locators/terms&conditionsLocators';
import { needHelpLocators } from '../locators/needHelpLocators';
import { Context } from 'vm';

export class loginPage extends basePage {
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
    super(page);
    this.loginTitle = this.page.locator(loginLocators.loginTitle);
    this.emailInput = this.page.locator(loginLocators.emailInput);
    this.passwordInput = this.page.locator(loginLocators.passwordInput);
    this.loginButtonText = this.page.locator(loginLocators.loginButtonText);
    this.forgotPassword = this.page.locator(loginLocators.forgotPassword);
    this.dontHaveAccountText = this.page.locator(loginLocators.dontHaveAccountText);
    this.createAccount = this.page.locator(loginLocators.createAccount);
    this.termsAndConditions = this.page.locator(loginLocators.termsAndConditions);
    this.needHelp = this.page.locator(loginLocators.needHelp);
    this.wrongCredentials = this.page.locator(loginLocators.wrongCredentials);
    //drive
    this.driveTitle = this.page.locator(driveLocators.driveTitle);
    //account recovery
    this.accountRecoveryTitle = this.page.locator(accountRecoveryLocators.accountRecoveryTitle);
    //Sign Up
    this.createAccounTitle = this.page.locator(signUpLocators.createAccountTitle);
    // terms of service
  }

  async typeEmail(user: string | any) {
    await this.loginTitle.waitFor({ state: 'visible' });
    const emailPlaceholder = await this.emailInput.getAttribute('placeholder');
    expect(emailPlaceholder).toEqual('Email');
    await this.typeIn(loginLocators.emailInput, user);
  }
  async typePassword(password: string | any) {
    const passPlaceholder = await this.passwordInput.getAttribute('placeholder');
    expect(passPlaceholder).toEqual('Password');
    await this.typeIn(loginLocators.passwordInput, password);
  }
  async clickLogIn(password: string | any) {
    if (password === 'test123.') {
      const loginButtonText = await this.loginButtonText.textContent();
      expect(loginButtonText).toEqual('Log in');
      await this.clickOn(loginLocators.loginButton);
      await this.driveTitle.waitFor();
      const driveTitle = await this.driveTitle.textContent();
      return driveTitle;
    } else {
      await this.clickOn(loginLocators.loginButton);
      await this.wrongCredentials.waitFor();
      const wrongLoginText = await this.wrongCredentials.textContent();
      return wrongLoginText;
    }
  }
  async clickOnForgotYourPassword() {
    await this.loginTitle.waitFor({ state: 'visible' });
    this.clickOn(loginLocators.forgotPassword);
    await this.accountRecoveryTitle.waitFor({ state: 'visible' });
    const accountRecoveryText = await this.accountRecoveryTitle.textContent();
    return accountRecoveryText;
  }

  async clickOnCreateAccount() {
    await this.loginTitle.waitFor({ state: 'visible' });
    const dontHaveAccountText = await this.dontHaveAccountText.textContent();
    const createAccountText = await this.createAccount.textContent();
    await this.clickOn(loginLocators.createAccount);
    await this.createAccounTitle.waitFor({ state: 'visible' });
    const createAccountTitle = await this.createAccounTitle.textContent();

    return { dontHaveAccountText, createAccountText, createAccountTitle };
  }

  async clickOnTermsAndConditions(context: Context) {
    const pagePromise = context.waitForEvent('page');
    await this.termsAndConditions.waitFor({ state: 'visible' });
    const termsAndConditionsText = await this.termsAndConditions.textContent();
    await this.clickOn(loginLocators.termsAndConditions);

    const newPage = await pagePromise;
    const termsOfServiceTitle = await newPage.locator(termsAndConditionsLocators.termsOfService).textContent();
    return { termsAndConditionsText, termsOfServiceTitle };
  }

  async clickOnNeedHelp(context: Context) {
    const pagePromise = context.waitForEvent('page');
    await this.needHelp.waitFor({ state: 'visible' });
    const needHelpText = await this.needHelp.textContent();
    await this.clickOn(loginLocators.needHelp);

    const newPage = await pagePromise;
    const needHelpPageTitle = await newPage.locator(needHelpLocators.needHelpTitle).textContent();
    return { needHelpText, needHelpPageTitle };
  }
}
