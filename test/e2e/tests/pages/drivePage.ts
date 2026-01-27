import { expect, Locator, Page } from '@playwright/test';

export class DrivePage {
  private page: Page;
  private driveTitle: Locator;
  private createFolderHeaderButton: Locator;
  private folderCreationModal: Locator;
  private newFolderModalTitle: Locator;
  private inputTitle: Locator;
  private nameInput: Locator;
  private cancelFolderCreationButton: Locator;
  private cancelFolderCreationButtonText: Locator;
  private createFolderButton: Locator;
  private createFolderButtonText: Locator;
  private filesAndFolders: Locator;
  private itemsCheckbox: Locator;
  private allFolderNamesInDrive: Locator;
  private sendToTrashHeaderButton: Locator;
  private deletionConfirmationMessage: Locator;
  private rightClickOnBodyModal: Locator;
  private contextMenuCreateFolderButton: Locator;
  private contextMenuCreateFolderButtonText: Locator;
  private contextMenuCreateFolderButtonSymbol: Locator;
  private uploadFilesHeaderButton: Locator;
  private uploadDownloadWidget: Locator;
  private uploadWidgetBorder: Locator;
  private movingToTrashAndMovedSign: Locator;

  constructor(page: Page) {
    this.page = page;
    this.driveTitle = this.page.locator('[title="Drive"]');
    this.createFolderHeaderButton = this.page.locator(
      '[class="flex items-center space-x-2"] button[data-cy="topBarCreateFolderButton"]',
    );
    //FOLDER CREATION MODAL
    this.folderCreationModal = this.page.locator('[class$=" transition-all opacity-100 scale-100"]');
    this.newFolderModalTitle = this.page.locator('[class="text-2xl font-medium text-gray-100"]');
    this.inputTitle = this.page.locator('[class*="w-full text-gray-100 max-w-sm "] span');
    this.nameInput = this.page.getByPlaceholder('Untitled folder', { exact: true });
    this.cancelFolderCreationButton = this.page.getByRole('button', { name: 'Cancel' });
    this.cancelFolderCreationButtonText = this.page.locator(
      '[class$="dark:active:bg-gray-10 text-gray-80 shadow-sm "] div',
    );
    this.createFolderButtonText = this.page.locator(
      '[class="flex items-center justify-center space-x-2"]:has-text("Create")',
    );
    this.createFolderButton = this.page.getByRole('button', { name: 'Create' });
    this.filesAndFolders = this.page.locator('[class$="pr-5 focus-within:bg-gray-1 hover:bg-gray-1"]');
    this.itemsCheckbox = this.page.locator('[class$="text-white border-gray-30 hover:border-gray-40"]');
    this.allFolderNamesInDrive = this.page.locator('[class$="items-center truncate pr-2"] p');
    this.deletionConfirmationMessage = this.page.locator(
      '[class="transition ease-out duration-200 opacity-100 scale-100"] p',
    );
    this.movingToTrashAndMovedSign = this.page.locator('[class$="10 bg-surface p-3 dark:bg-gray-5"]');
    //RIGHT CLICK ON BODY OPTIONS
    this.rightClickOnBodyModal = this.page.locator(
      '[data-headlessui-state="open"] [class="absolute scale-100 opacity-100"]',
    );
    this.contextMenuCreateFolderButton = this.page.locator('div[data-cy="contextMenuCreateFolderButton"]');
    this.contextMenuCreateFolderButtonText = this.page.locator('[data-cy="contextMenuCreateFolderButtonText"]');
    this.contextMenuCreateFolderButtonSymbol = this.page.locator('[data-cy="contextMenuCreateFolderButton"] span');
    //HEADER OPTIONS
    this.sendToTrashHeaderButton = this.page.locator('[data-tooltip-content="Move to trash"]');
    this.uploadFilesHeaderButton = this.page.locator('[data-cy="topBarUploadFilesButton"]');
    //UPLOAD DOWNLOAD WIDGET
    this.uploadDownloadWidget = this.page.locator(
      '[class$="rounded-xl border border-gray-10 bg-surface dark:bg-gray-1 "]',
    );
    this.uploadWidgetBorder = this.page.locator('[class$="border-b border-gray-10 bg-gray-5 px-3 py-2.5"]');
  }
  async checkFolder(folderName: string) {
    const folderLocator = this.allFolderNamesInDrive.filter({ hasText: folderName });
    await folderLocator.waitFor({ timeout: 10000 });
    const createdFolderName = await folderLocator.textContent();

    return createdFolderName;
  }

  async clickOnCreateFolderHeaderButton() {
    await expect(this.createFolderHeaderButton).toBeVisible({ timeout: 10000 });
    await this.createFolderHeaderButton.dispatchEvent('click');
  }

  async typeInFolderName(folderName: string) {
    await expect(this.folderCreationModal).toBeVisible();
    const modalTitle = await this.newFolderModalTitle.textContent();
    expect(modalTitle).toEqual('New folder');
    const inputTitle = await this.inputTitle.textContent();
    expect(inputTitle).toEqual('Name');
    const inputPlaceholder = await this.nameInput.getAttribute('placeholder');
    expect(inputPlaceholder).toEqual('Untitled folder');
    await this.nameInput.fill(folderName);
  }

  async clickOnCreateFolder(folderName: string) {
    await expect(this.createFolderButton).toBeVisible();
    const createButtonText = await this.createFolderButtonText.textContent();
    expect(createButtonText).toEqual('Create');
    await this.createFolderButton.click();
    await this.page.waitForTimeout(500);
    const createdFolderName = await this.checkFolder(folderName);
    return createdFolderName;
  }

  async clickOnCancelFolderCreation() {
    await expect(this.folderCreationModal).toBeVisible();
    const cancelButton = this.folderCreationModal.locator('button', { hasText: 'Cancel' });
    await expect(cancelButton).toBeVisible();
    const buttonText = await cancelButton.textContent();
    expect(buttonText).toEqual('Cancel');
    await cancelButton.click();
    return this.folderCreationModal;
  }
  async rightClickOnBody() {
    await expect(this.driveTitle).toBeVisible({ timeout: 10000 });
    await this.page.locator('body').click({ button: 'right' });
    await this.page.waitForTimeout(500);
    //await expect(this.rightClickOnBodyModal).toBeVisible()
  }

  async clickOnNewFolderContextMenu() {
    const button = this.contextMenuCreateFolderButton;
    await expect(button).toBeVisible();
    const newFolderButtonText = await this.contextMenuCreateFolderButtonText.textContent();
    expect(newFolderButtonText).toEqual('New folder');
    const buttonSymbols = await this.contextMenuCreateFolderButtonSymbol.textContent();
    expect(buttonSymbols).toContain('F');
    await button.click();
  }
  async pressShiftAndF() {
    await this.page.keyboard.press('Shift+f');
  }
  async getRandomNumber(min: number, max: number) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
  async chooseRandomItemInDrive() {
    await expect(this.filesAndFolders.first()).toBeVisible();
    const checkBoxes = await this.itemsCheckbox.count();
    const randomNumber = await this.getRandomNumber(1, checkBoxes - 1);
    console.log(`selected random checkbox: ${randomNumber}`);
    await expect(this.itemsCheckbox.nth(+randomNumber)).toBeVisible();
    await this.itemsCheckbox.nth(+randomNumber).check();
  }
  async clickOnSendToTrashButton() {
    expect(this.sendToTrashHeaderButton).toBeVisible();
    await this.sendToTrashHeaderButton.click();
    await expect(this.movingToTrashAndMovedSign).toBeVisible();
    const movingToTrashSign = await this.movingToTrashAndMovedSign.textContent();
    expect(movingToTrashSign).toEqual('Moving items to trash');
    await expect
      .poll(async () => await this.movingToTrashAndMovedSign.textContent(), { timeout: 6000 })
      .toContain('moved to trash');
    const movedToTrash = await this.movingToTrashAndMovedSign.textContent();
    return movedToTrash;
  }
  async uploadItemToDrive() {
    const fileChooserPromise = this.page.waitForEvent('filechooser');
    await this.uploadFilesHeaderButton.click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles('C:/drive-web/tests/uploads/ingles folder data.xlsx');
    await expect(this.uploadWidgetBorder).toBeVisible({ timeout: 5000 });
    await expect
      .poll(async () => await this.uploadWidgetBorder.textContent(), { timeout: 10000 })
      .toEqual('All processes have finished');
  }
  async selectItemForDeleting() {
    const item = this.filesAndFolders.filter({ hasText: 'ingles folder data' });
    await expect(item).toBeVisible();
    const checkBox = item.locator('[class$="text-white border-gray-30 hover:border-gray-40"]');
    await checkBox.click();
  }
}
