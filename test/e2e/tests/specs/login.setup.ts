import { faker } from '@faker-js/faker';
import { expect, test as setup } from '@playwright/test';
import { loginPage } from '../pages/loginPage';
import { signUpPage } from '../pages/signUpPage';
const fs = require('fs');

const authFile = './tests/specs/playwright/.auth/user.json';
const credentialsFile = './tests/specs/playwright/.auth/credentials.json';

//UI LOGIN

setup('Creating new user and logging in', async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  const SignupPage = new signUpPage(page);

  const email = faker.internet.email();
  const password = faker.internet.password();
  const userCredentials = { email, password };
  fs.writeFileSync(credentialsFile, JSON.stringify(userCredentials));

  console.log(`User data, new user: ${email}, password: ${password}`);

  await page.goto('http://localhost:3000/new');

  await SignupPage.typeInEmail(email);
  await SignupPage.typeInPassword(password);
  await SignupPage.clickOnCreateAccountButton();
  await SignupPage.userWelcome();
  await page.waitForTimeout(2000);

  await context.close();

  const newContext = await browser.newContext();
  const newPage = await newContext.newPage();

  const loginpage = new loginPage(newPage);

  await newPage.goto('http://localhost:3000/login');
  await expect(newPage).toHaveURL(/.*login/);

  //const endpointPromise = newPage.waitForResponse('https://drive.internxt.com/api/access');
  const endpointPromise = newPage.waitForResponse('https://drive.internxt.com/api/access');
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
