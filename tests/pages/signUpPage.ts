import { Page, expect, Locator } from '@playwright/test';
import { basePage } from './basePage';
import { signUpLocators } from '../locators/signUp';
import { Context } from 'vm';
import { howToCreateBackUpLocators } from '../locators/howToCreateBackUpKeyLocators';
import { termsAndConditionsLocators } from '../locators/terms&conditions';
import { needHelpLocators } from '../locators/needHelpLocators';

export class signUpPage extends basePage {
  private createAccountTitle: Locator;
  private emailInput: Locator;
  private passwordInput: Locator;
  private passwordWarning: Locator;
  private disclaimer: Locator;
  private learnMoreLinkText: Locator;
  private createAccountButton: Locator;
  private createAccountButtonText: Locator;
  private byCreatingYourAccountText: Locator;
  private dontHaveAccountText: Locator;
  private logIn: Locator;
  private termsAndConditions: Locator;
  private needHelp: Locator;
  private userAlreadyRegistered: Locator;

  constructor(page: Page) {
    super(page);

    (this.createAccountTitle = this.page.locator(signUpLocators.createAccountTitle)),
      (this.emailInput = this.page.locator(signUpLocators.emailInput));
    this.passwordInput = this.page.locator(signUpLocators.passwordInput);
    this.passwordWarning = this.page.locator(signUpLocators.passwordWarnings);
    this.disclaimer = this.page.locator(signUpLocators.disclaimer);
    this.learnMoreLinkText = this.page.locator(signUpLocators.learnMoreLinkText);
    this.createAccountButton = this.page.locator(signUpLocators.createAccountButton);
    this.createAccountButtonText = this.page.locator(signUpLocators.createAccountButtonText);
    this.byCreatingYourAccountText = this.page.locator(signUpLocators.byCreatingYourAccountText);
    this.dontHaveAccountText = this.page.locator(signUpLocators.dontHaveAccountText);
    this.logIn = this.page.locator(signUpLocators.logIn);
    this.termsAndConditions = this.page.locator(signUpLocators.termsAndConditions);
    this.needHelp = this.page.locator(signUpLocators.needHelp);
    this.userAlreadyRegistered = this.page.locator(signUpLocators.userAlreadyRegisteredText);
  }

  async typeInEmail(email: string) {
    await this.createAccountTitle.waitFor({ state: 'visible' });
    const createAccountTitle = await this.createAccountTitle.textContent();
    expect(createAccountTitle).toEqual('Create account');
    const emailPlaceholder = await this.emailInput.getAttribute('placeholder');
    expect(emailPlaceholder).toEqual('Email');
    await this.typeIn(signUpLocators.emailInput, email);
  }

  async typeInPassword(password: string) {
    const passwordPlaceholder = await this.passwordInput.getAttribute('placeholder');
    expect(passwordPlaceholder).toEqual('Password');
    await this.typeIn(signUpLocators.passwordInput, password);
    await this.passwordWarning.waitFor({ state: 'visible' });
    const passwordWarning = this.passwordWarning.textContent();
    return passwordWarning;
  }
  async clickOnCreateAccount() {
    const createAccountbuttonText = await this.createAccountButtonText.textContent();
    expect(createAccountbuttonText).toEqual('Create account');
    await this.clickOn(signUpLocators.createAccountButton);
    await this.userAlreadyRegistered.waitFor({ state: 'visible' });
    const userAlreadyRegisteredText = await this.userAlreadyRegistered.textContent();
    return userAlreadyRegisteredText;
  }
  async clickOnLearnMore(context) {
    const pagePromise = context.waitForEvent('page');
    await this.disclaimer.waitFor({ state: 'visible' });
    const disclaimer = await this.disclaimer.textContent();
    await this.clickOn(signUpLocators.learnMoreLinkText);
    const newPage = await pagePromise;
    const howToCreateBackUpKeyPageTitle = await newPage
      .locator(howToCreateBackUpLocators.howToCreateBackUpTitle)
      .textContent();
    return { disclaimer, howToCreateBackUpKeyPageTitle };
  }
  async clickOnTermsAndConditions(context: Context) {
    const pagePromise = context.waitForEvent('page');
    await this.termsAndConditions.waitFor({ state: 'visible' });
    const termsAndConditionsText = await this.termsAndConditions.textContent();
    await this.clickOn(signUpLocators.termsAndConditions);

    const newPage = await pagePromise;
    const termsOfServiceTitle = await newPage.locator(termsAndConditionsLocators.termsOfService).textContent();

    return { termsAndConditionsText, termsOfServiceTitle };
  }

  async clickOnNeedHelp(context: Context) {
    const pagePromise = context.waitForEvent('page');
    await this.needHelp.waitFor({ state: 'visible' });
    const needHelpText = await this.needHelp.textContent();
    await this.clickOn(signUpLocators.needHelp);

    const newPage = await pagePromise;
    const needHelpPageTitle = await newPage.locator(needHelpLocators.needHelpTitle).textContent();
    return { needHelpText, needHelpPageTitle };
  }
}
