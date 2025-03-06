import { faker } from '@faker-js/faker';
import { expect, test } from '@playwright/test';
import { staticData } from '../helper/staticData';
import { DrivePage } from '../pages/drivePage';

// Skip temporarily
test.describe.skip('Internxt folder creation and deletion', async () => {
  test.beforeEach('Visiting Internxt', async ({ page }) => {
    await page.goto(staticData.driveURL);
  });
  test('TC1: Validate that the user can create a new folder with the “create new folder” button', async ({ page }) => {
    const drivePage = new DrivePage(page);
    const newFolderName = faker.person.jobTitle();
    await drivePage.clickOnCreateFolderHeaderButton();
    await drivePage.typeInFolderName(newFolderName);
    const createdFolderName = await drivePage.clickOnCreateFolder(newFolderName);
    expect(createdFolderName).toEqual(newFolderName);
  });
  test('TC2: Validate that the user can cancel the folder creation', async ({ page }) => {
    const drivePage = new DrivePage(page);
    await drivePage.clickOnCreateFolderHeaderButton();
    const folderCreationModal = await drivePage.clickOnCancelFolderCreation();
    await expect(folderCreationModal).toBeHidden();
  });
  test('TC3: Validate that the user can create a new folder with the right-click option → “new folder”', async ({
    page,
  }) => {
    test.setTimeout(50000);
    const drivePage = new DrivePage(page);
    const folderName = faker.commerce.department();

    await drivePage.rightClickOnBody();
    await drivePage.clickOnNewFolderContextMenu();
    await drivePage.typeInFolderName(folderName);
    const createdFolderName = await drivePage.clickOnCreateFolder(folderName);
    expect(createdFolderName).toEqual(folderName);
  });
  test('TC4: Validate that the user can cancel the folder creation operation', async ({ page }) => {
    test.setTimeout(50000);
    const drivePage = new DrivePage(page);

    await drivePage.rightClickOnBody();
    await drivePage.clickOnNewFolderContextMenu();
    const folderCreationModal = await drivePage.clickOnCancelFolderCreation();
    await expect(folderCreationModal).toBeHidden();
  });
  test('TC5: Validate that the user can create a new folder by pressing “↑F” after the right-click', async ({
    page,
  }) => {
    test.setTimeout(50000);
    const drivePage = new DrivePage(page);
    const folderName = faker.company.catchPhraseAdjective();
    await drivePage.rightClickOnBody();
    await drivePage.pressShiftAndF();
    await drivePage.typeInFolderName(folderName);
    const createdFolderName = await drivePage.clickOnCreateFolder(folderName);
    expect(createdFolderName).toEqual(folderName);
  });
});
