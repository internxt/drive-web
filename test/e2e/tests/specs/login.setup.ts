import { faker } from '@faker-js/faker';
import { expect, test as setup } from '@playwright/test';
import fs from 'fs';
import { LoginPage } from '../pages/loginPage';
import { SignUpPage } from '../pages/signUpPage';

const authFile = './test/e2e/tests/specs/playwright/auth/user.json';
const credentialsFile = './test/e2e/tests/specs/playwright/auth/credentials.json';
const BASE_API_URL = process.env.REACT_APP_DRIVE_NEW_API_URL;

//UI LOGIN

setup('Creating new user and logging in', async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  const SignupPage = new SignUpPage(page);

  const email = faker.internet.email().toLocaleLowerCase();
  const password = faker.internet.password();
  const userCredentials = { email: email.toLowerCase(), password };
  fs.writeFileSync(credentialsFile, JSON.stringify(userCredentials));

  await page.goto('/new');

  await SignupPage.typeInEmail(email);
  await SignupPage.typeInPassword(password);

  await SignupPage.clickOnCreateAccountButton();
  await SignupPage.userWelcome();
  await page.waitForTimeout(2000);

  await context.close();

  const newContext = await browser.newContext();
  const newPage = await newContext.newPage();

  const loginpage = new LoginPage(newPage);

  await newPage.goto('/login');
  await expect(newPage).toHaveURL(/.*login/);

  const endpointPromise = newPage.waitForResponse(`${BASE_API_URL}/auth/login/access`);
  await loginpage.typeEmail(email);
  await loginpage.typePassword(password);

  await loginpage.clickLogIn();

  const response = await endpointPromise;
  const responseJSON = await response.json();
  const userId = responseJSON.user.userId;

  await newPage.context().storageState({ path: authFile });

  const authData = JSON.parse(fs.readFileSync(authFile, 'utf-8'));

  const tutorialComplete = {
    name: 'signUpTutorialCompleted',
    value: userId,
  };

  authData.origins[0].localStorage.push(tutorialComplete);

  fs.writeFileSync(authFile, JSON.stringify(authData, null, 2));

  await newContext.close();
});
