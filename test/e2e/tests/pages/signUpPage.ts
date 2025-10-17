import { expect, Locator, Page } from '@playwright/test';
import { Context } from 'vm';

export class SignUpPage {
  page: Page;
  private createAccountTitle: Locator;
  private emailInput: Locator;
  private passwordInput: Locator;
  private passwordWarning: Locator;
  private disclaimer: Locator;
  private learnMoreLinkText: Locator;
  private createAccountButton: Locator;
  private createAccountButtonText: Locator;
  private byCreatingYourAccountText: Locator;
  private alreadyHaveAccountText: Locator;
  private logIn: Locator;
  private termsAndConditions: Locator;
  private needHelp: Locator;
  private userAlreadyRegistered: Locator;
  //SIGN IN PAGE
  private loginTitle: Locator;
  //DRIVE
  private driveTitle: Locator;

  constructor(page: Page) {
    this.page = page;
    this.createAccountTitle = this.page.getByRole('heading', { level: 1 });
    this.emailInput = this.page.getByPlaceholder('Email', { exact: true });
    this.passwordInput = this.page.getByPlaceholder('Password', { exact: true });
    this.passwordWarning = this.page.locator('[class="pt-1"] p');
    this.disclaimer = this.page.locator('[class$="pr-4 dark:bg-primary/20"] p');
    this.learnMoreLinkText = this.page.getByRole('link', { name: 'Learn more' });
    this.createAccountButton = this.page.getByRole('button', { name: 'Create account' });
    this.createAccountButtonText = this.page.locator('[class$="justify-center space-x-2"]');
    this.byCreatingYourAccountText = this.page.locator('[class="mt-2 w-full text-xs text-gray-50"]');
    this.alreadyHaveAccountText = this.page.locator('[class$="space-x-1.5 font-medium"] span');
    this.logIn = this.page.getByRole('link', { name: 'Log in' });
    this.termsAndConditions = this.page.getByRole('link', { name: 'you accept the terms & conditions' });
    this.needHelp = this.page.getByRole('link', { name: 'Need help?' });
    this.userAlreadyRegistered = this.page.locator('[class="font-base w-56 text-sm text-red"]');
    //LOGIN PAGE
    this.loginTitle = this.page.getByRole('heading', { level: 1 });
    //DRIVE PAGE
    this.driveTitle = this.page.locator('[class="max-w-sm flex-1 cursor-pointer truncate undefined"]');
  }

  async typeInEmail(email: string) {
    await this.createAccountTitle.waitFor({ state: 'visible' });
    const createAccountTitle = await this.createAccountTitle.textContent();
    expect(createAccountTitle).toEqual('Create account');
    const emailPlaceholder = await this.emailInput.getAttribute('placeholder');
    expect(emailPlaceholder).toEqual('Email');
    await this.emailInput.fill(email);
  }

  async typeInPassword(password: string) {
    const passwordPlaceholder = await this.passwordInput.getAttribute('placeholder');
    expect(passwordPlaceholder).toEqual('Password');
    await this.passwordInput.fill(password);
    await this.passwordWarning.waitFor({ state: 'visible' });
    const passwordWarning = this.passwordWarning.textContent();
    return passwordWarning;
  }
  async clickOnCreateAccountButton() {
    const createAccountbuttonText = await this.createAccountButtonText.textContent();
    expect(createAccountbuttonText).toEqual('Create account');
    expect(this.createAccountButton).toBeEnabled();
    await this.createAccountButton.click();
    await this.page.waitForTimeout(1000);
  }
  async UserAlreadyExistAssertion() {
    await this.userAlreadyRegistered.waitFor({ state: 'visible' });
    const userAlreadyRegisteredText = await this.userAlreadyRegistered.textContent();
    return userAlreadyRegisteredText;
  }
  async userWelcome() {
    await expect(this.driveTitle).toBeVisible({ timeout: 30000 });
    const welcomeText = this.driveTitle.textContent();
    return welcomeText;
  }
  async clickOnLearnMore(context) {
    const pagePromise = context.waitForEvent('page');
    await this.disclaimer.waitFor({ state: 'visible' });
    const disclaimer = await this.disclaimer.textContent();
    await this.learnMoreLinkText.click();
    const newPage = await pagePromise;
    const howToCreateBackUpKeyPageTitle = await newPage.locator('[class$="text-body-primary-color"]').textContent();
    return { disclaimer, howToCreateBackUpKeyPageTitle };
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

  async clickOnLogIn() {
    await this.logIn.waitFor({ state: 'visible' });
    const logInText = await this.logIn.textContent();
    await this.logIn.click();
    await this.loginTitle.waitFor({ state: 'visible' });
    const logInTitle = await this.loginTitle.textContent();
    return { logInText, logInTitle };
  }
}
