import { faker } from '@faker-js/faker';
import { expect, Request, Route, test } from '@playwright/test';
import { getUser, getUserCredentials } from '../helper/getUser';
import { staticData } from '../helper/staticData';
import { SignUpPage } from '../pages/signUpPage';
const BASE_API_URL = process.env.REACT_APP_DRIVE_NEW_API_URL;

const credentialsFile = getUserCredentials();
const user = getUser();
const invalidEmail = 'invalid@internxt.com';

const mockedCall = async (route: Route, request: Request) => {
  const { email } = request.postDataJSON();

  if (invalidEmail === email) {
    return route.fulfill({
      status: 409,
      body: JSON.stringify({ message: `${invalidEmail} already registered` }),
    });
  }

  await route.fulfill({
    status: 200,
    body: JSON.stringify(user),
  });
};

test.describe('Internxt SignUp', async () => {
  test.use({ storageState: { cookies: [], origins: [] } });
  test.beforeEach('Visiting Internxt Sign Up Page', async ({ page }) => {
    await page.route(`${BASE_API_URL}/users`, mockedCall);

    await page.goto(staticData.signUpURL);
  });

  test('TC1: Validate that the user can create a new account', async ({ page }) => {
    test.setTimeout(60000);

    const signupPage = new SignUpPage(page);
    const newEmail = faker.internet.email();
    const newPassword = faker.internet.password();

    await signupPage.typeInEmail(newEmail);
    await signupPage.typeInPassword(newPassword);
    await signupPage.clickOnCreateAccountButton();
    const welcomeText = await signupPage.userWelcome();
    expect(welcomeText).toEqual(staticData.driveTitle);
  });

  test('TC2: Validate that the user can’t sign up if the email address is already used', async ({ page }) => {
    const signupPage = new SignUpPage(page);

    await signupPage.typeInEmail(invalidEmail);
    await signupPage.typeInPassword(credentialsFile.password as string);
    await signupPage.clickOnCreateAccountButton();
    const userAlreadyRegisteredText = await signupPage.UserAlreadyExistAssertion();
    expect(userAlreadyRegisteredText).toContain(staticData.userAlreadyRegistered);
  });

  test('TC3: Validate that the user can’t sign up if the password is too short', async ({ page }) => {
    const signupPage = new SignUpPage(page);
    const email = faker.internet.email();

    await signupPage.typeInEmail(email);
    const passwordWarning = await signupPage.typeInPassword(staticData.tooShortPassword);
    expect(passwordWarning).toEqual(staticData.passwordNotLongEnough);
  });

  test('TC4: Validate that the user can’t sign up if the password is not complex enough', async ({ page }) => {
    const signupPage = new SignUpPage(page);
    const email = faker.internet.email();

    await signupPage.typeInEmail(email);
    const passwordWarning = await signupPage.typeInPassword(staticData.notComplexPassword);
    expect(passwordWarning).toEqual(staticData.passwordNotComplex);
  });

  test('TC5: Validate that the user is redirected to “how to create a backup key” page after clicking on “Learn more”', async ({
    page,
    context,
  }) => {
    const SignupPage = new SignUpPage(page);

    const { disclaimer, howToCreateBackUpKeyPageTitle } = await SignupPage.clickOnLearnMore(context);
    expect(disclaimer).toEqual(staticData.disclaimer);
    expect(howToCreateBackUpKeyPageTitle).toEqual(staticData.howToCreateBackUpKeyPageTitle);
  });

  test('TC6: Validate that the user is redirected to “terms of service” after clicking on “you accept the terms and conditions”', async ({
    page,
    context,
  }) => {
    const SignupPage = new SignUpPage(page);

    const { termsAndConditionsText, termsOfServiceTitle } = await SignupPage.clickOnTermsAndConditions(context);
    expect(termsAndConditionsText).toEqual(staticData.youAcceptTermsLinkText);
    expect(termsOfServiceTitle).toEqual(staticData.termsOfServiceTitle);
  });

  test('TC7: Validate that the user is redirected to the “Login” page after clicking on “Log in”', async ({ page }) => {
    const SignupPage = new SignUpPage(page);

    const { logInText, logInTitle } = await SignupPage.clickOnLogIn();
    expect(logInText).toEqual(staticData.logInButtonText);
    expect(logInTitle).toEqual(staticData.logInPageTitle);
  });

  test('TC8: Validate that the user can go to the “need help” page after clicking on “need help”', async ({
    page,
    context,
  }) => {
    const SignupPage = new SignUpPage(page);

    const { needHelpText, needHelpPageTitle } = await SignupPage.clickOnNeedHelp(context);
    expect(needHelpText).toEqual(staticData.needHelpLinkText);
    expect(needHelpPageTitle).toEqual(staticData.needHelpTitle);
  });
});
