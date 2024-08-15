import { expect, test } from '@playwright/test';
import { driveLocators } from '../locators/driveLocators';
import { staticData } from '../helper/staticData';

test.describe('Internxt folder creation and deletion', async () => {
  test.beforeEach('Visiting Internxt', async ({ page }) => {
    await page.goto(staticData.drive);
  });
  test('trying login setup', async ({ page }) => {
    const driveTitle = await page.locator(driveLocators.driveTitle).textContent();
    console.log(driveTitle);
  });
});
