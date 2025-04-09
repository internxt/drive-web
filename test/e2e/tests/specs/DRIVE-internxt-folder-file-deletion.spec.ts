import { expect, test } from '@playwright/test';
import { staticData } from '../helper/staticData';
import { DrivePage } from '../pages/drivePage';

// skip temporarily
test.describe.skip('Internxt file/folder deletion', () => {
  test.beforeEach('Visiting Internxt', async ({ page }) => {
    const drivePage = new DrivePage(page);
    await page.goto(staticData.driveURL);
    await drivePage.uploadItemToDrive();
  });

  test('TC1: Validate that the user can delete a folder/file with the trash icon button', async ({ page }) => {
    const drivePage = new DrivePage(page);
    await drivePage.selectItemForDeleting();
    const movedToTrash = await drivePage.clickOnSendToTrashButton();
    expect(movedToTrash).toContain(staticData.itemMovedToTrash);
  });
});
