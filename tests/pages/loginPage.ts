import { Page, Locator, expect } from '@playwright/test';
import { basePage } from './basePage';
import { loginLocators } from '../locators/login';
import { driveLocators } from '../locators/drive';
import { signUpLocators } from '../locators/signUp';
import { accountRecoveryLocators } from '../locators/accountRecovery';
export let expectedWrongLoginText: string | any;
export let accountRecoveryText: string | any;

export class loginPage extends basePage {
  private loginTitle: Locator;
  private emailInput: Locator;
  private passwordInput: Locator;
  private loginButton: Locator;
  private loginButtonText: Locator;
  private forgotPassword: Locator;
  private dontHaveAccountText: Locator;
  private createAccount: Locator;
  private terminsAndConditions: Locator;
  private needHelp: Locator;
  private wrongCredentials: Locator;
  //drive
  private driveTitle: Locator;
  //accountRecovery
  private accountRecoveryTitle: Locator;
  //SignUp
  private createAccounTitle: Locator;

  constructor(page: Page) {
    super(page);
    this.loginTitle = this.page.locator(loginLocators.loginTitle);
    this.emailInput = this.page.locator(loginLocators.emailInput);
    this.passwordInput = this.page.locator(loginLocators.passwordInput);
    this.loginButtonText = this.page.locator(loginLocators.loginButtonText);
    this.forgotPassword = this.page.locator(loginLocators.forgotPassword);
    this.dontHaveAccountText = this.page.locator(loginLocators.dontHaveAccountText);
    this.createAccount = this.page.locator(loginLocators.createAccount);
    this.terminsAndConditions = this.page.locator(loginLocators.terminsAndConditions);
    this.needHelp = this.page.locator(loginLocators.needHelp);
    this.wrongCredentials = this.page.locator(loginLocators.wrongCredentials);
    //drive
    this.driveTitle = this.page.locator(driveLocators.driveTitle);
    //account recovery
    this.accountRecoveryTitle = this.page.locator(accountRecoveryLocators.accountRecoveryTitle);
    //Sign Up
    this.createAccounTitle = this.page.locator(signUpLocators.createAccountTitle);
  }

  async typeEmail(user: string) {
    await this.loginTitle.waitFor({ state: 'visible' });
    const emailPlaceholder = await this.emailInput.getAttribute('placeholder');
    expect(emailPlaceholder).toEqual('Email');
    await this.typeIn(loginLocators.emailInput, user);
  }
  async typePassword(password: string) {
    const passPlaceholder = await this.passwordInput.getAttribute('placeholder');
    expect(passPlaceholder).toEqual('Password');
    await this.typeIn(loginLocators.passwordInput, password);
  }
  async clickLogIn(password: string) {
    if (password === 'test123.') {
      const loginButtonText = await this.loginButtonText.textContent();
      expect(loginButtonText).toEqual('Log in');
      await this.clickOn(loginLocators.loginButton);
      await this.driveTitle.waitFor();
    } else {
      await this.clickOn(loginLocators.loginButton);
      await this.wrongCredentials.waitFor();
      expectedWrongLoginText = await this.wrongCredentials.textContent();
    }
  }
  async clickOnForgotYourPassword() {
    await this.loginTitle.waitFor({ state: 'visible' });
    this.clickOn(loginLocators.forgotPassword);
    await this.accountRecoveryTitle.waitFor({ state: 'visible' });
    accountRecoveryText = await this.accountRecoveryTitle.textContent();
  }

  async clickOnCreateAccount() {
    await this.loginTitle.waitFor({ state: 'visible' });
    const expectedDontHaveAccountText = await this.page.locator(loginLocators.dontHaveAccountText).textContent();
    const expectedCreateAccountText = await this.page.locator(loginLocators.createAccount).textContent();
    await this.clickOn(loginLocators.createAccount);
    await this.createAccounTitle.waitFor({ state: 'visible' });
    const expectedCreateAccountTitle = await this.page.locator(signUpLocators.createAccountTitle).textContent();

    return { expectedDontHaveAccountText, expectedCreateAccountText, expectedCreateAccountTitle };
  }
}
