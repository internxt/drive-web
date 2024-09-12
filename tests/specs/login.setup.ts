import { expect, test as setup } from '@playwright/test';
import { loginPage } from '../pages/loginPage';
import { signUpPage } from '../pages/signUpPage';
import { faker } from '@faker-js/faker';
import { userCredentials } from '../global';
const authFile = './tests/specs/playwright/.auth/user.json';

//UI LOGIN

setup('Creating new user and logging in', async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  const SignupPage = new signUpPage(page);

  const email = faker.internet.email();
  const password = faker.internet.password();
  userCredentials.email = email;
  userCredentials.password = password;

  console.log(`User data, new user: ${email}`);

  await page.goto('https://staging.drive.internxt.com/new');

  await SignupPage.typeInEmail(email);
  await SignupPage.typeInPassword(password);
  await SignupPage.clickOnCreateAccountButton();
  await SignupPage.userWelcome();
  await page.waitForTimeout(3000);

  await context.close();

  // Create a new context for logging in (fresh session)
  const newContext = await browser.newContext();
  const newPage = await newContext.newPage();

  const loginpage = new loginPage(newPage);

  await newPage.goto('https://staging.drive.internxt.com/login');
  await expect(newPage).toHaveURL(/.*login/);
  await loginpage.typeEmail(email);
  await loginpage.typePassword(password);
  await loginpage.clickLogIn(password);

  await newPage.context().storageState({ path: authFile });
});
