import { test as setup } from '@playwright/test';
import { loginPage } from '../pages/loginPage';
import { faker } from '@faker-js/faker';
import { staticData } from '../helper/staticData';

const authFile = './tests/specs/playwright/.auth/user.json';

//UI LOGIN

setup('Logging in', async ({ page }) => {
  const loginpage = new loginPage(page);

  await page.goto('/');
  await loginpage.typeEmail(staticData.email);
  await loginpage.typePassword(staticData.password);
  await loginpage.clickLogIn(staticData.password);

  await page.context().storageState({ path: authFile });
});
