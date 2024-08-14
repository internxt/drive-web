import { test, expect } from '@playwright/test';
import { signUpPage } from '../pages/signUpPage';
import { staticData } from '../helper/staticData';

test.describe('Internxt SignUp', async () => {
  test.beforeEach('Visiting Internxt Sign Up Page', async ({ page }) => {
    await page.goto(staticData.SignUp);
  });

  test.skip('TC1: Validate that the user can create a new account', async ({ page }) => {});

  test('TC2: Validate that the user can’t sign up if the email address is already used', async ({ page }) => {
    const signupPage = new signUpPage(page);

    await signupPage.typeInEmail(staticData.email);
    await signupPage.typeInPassword(staticData.password);
    const userAlreadyRegisteredText = await signupPage.clickOnCreateAccount();
    expect(userAlreadyRegisteredText).toContain('already registered');
  });

  test('TC3: Validate that the user can’t sign up if the password is too short', async ({ page }) => {
    const signupPage = new signUpPage(page);

    await signupPage.typeInEmail(staticData.email);
    const passwordWarning = await signupPage.typeInPassword(staticData.tooShortPassword);
    expect(passwordWarning).toEqual(staticData.passwordNotLongEnough);
  });

  test('TC4: Validate that the user can’t sign up if the password is not complex enough', async ({ page }) => {
    const signupPage = new signUpPage(page);

    await signupPage.typeInEmail(staticData.email);
    const passwordWarning = await signupPage.typeInPassword(staticData.notComplexPassword);
    expect(passwordWarning).toEqual(staticData.passwordNotComplex);
  });

  test('TC5: Validate that the user is redirected to “how to create a backup key” page after clicking on “Learn more”', async ({
    page,
    context,
  }) => {
    const SignupPage = new signUpPage(page);

    const { disclaimer, howToCreateBackUpKeyPageTitle } = await SignupPage.clickOnLearnMore(context);
    expect(disclaimer).toEqual(staticData.disclaimer);
    expect(howToCreateBackUpKeyPageTitle).toEqual(staticData.howToCreateBackUpKeyPageTitle);
  });

  test('TC6: Validate that the user is redirected to “terms of service” after clicking on “you accept the terms and conditions”', async ({
    page,
    context,
  }) => {
    const SignupPage = new signUpPage(page);

    const { termsAndConditionsText, termsOfServiceTitle } = await SignupPage.clickOnTermsAndConditions(context);
    expect(termsAndConditionsText).toEqual(staticData.termsAndConditions);
    expect(termsOfServiceTitle).toEqual(staticData.termsOfServiceTitle);
  });

  test('TC7: Validate that the user is redirected to the “Log in” page after clicking on “Log in”', async ({
    page,
  }) => {});

  test('TC8: Validate that the user can go to the “need help” page after clicking on “need help”', async ({
    page,
    context,
  }) => {
    const SignupPage = new signUpPage(page);

    const { needHelpText, needHelpPageTitle } = await SignupPage.clickOnNeedHelp(context);
    expect(needHelpText).toEqual(staticData.needHelpLinkText);
    expect(needHelpPageTitle).toEqual(staticData.needHelpTitle);
  });
});
