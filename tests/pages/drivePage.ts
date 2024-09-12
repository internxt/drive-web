import { test, expect, Locator, Page } from '@playwright/test';
import { basePage } from './basePage';

export class DrivePage extends basePage {
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
  private allFolderNamesInDrive: Locator;
  private rightClickOnBodyModal: Locator;
  private contextMenuCreateFolderButton: Locator;
  private contextMenuCreateFolderButtonText: Locator;
  private contextMenuCreateFolderButtonSymbol: Locator;

  constructor(page: Page) {
    super(page);
    this.driveTitle = this.page.locator('[title="Drive"]');
    this.createFolderHeaderButton = this.page.locator('div[data-tooltip-id="createfolder-tooltip"]');
    //FOLDER CREATION MODAL
    this.folderCreationModal = this.page.locator('form[class="flex flex-col space-y-5"]');
    this.newFolderModalTitle = this.page.locator('[class="text-2xl font-medium text-gray-100"]:has-text("New folder")');
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
    this.allFolderNamesInDrive = this.page.locator('[data-test="folder-name"]');
    //RIGHT CLICK ON BODY OPTIONS
    this.rightClickOnBodyModal = this.page.locator('[class="absolute scale-100 opacity-100"]');
    this.contextMenuCreateFolderButton = this.page.locator('[data-cy="contextMenuCreateFolderButton"]');
    this.contextMenuCreateFolderButtonText = this.page.locator('[data-cy="contextMenuCreateFolderButtonText"]');
    this.contextMenuCreateFolderButtonSymbol = this.page.locator('[data-cy="contextMenuCreateFolderButton"] span');
  }
  async checkFolder(folderName: string) {
    const folder = this.allFolderNamesInDrive.filter({ hasText: folderName });
    await folder.waitFor({ state: 'visible' });
    const createdFolderName = await folder.textContent();
    return createdFolderName;
  }

  async clickOnCreateFolderHeaderButton() {
    await this.createFolderHeaderButton.waitFor({ state: 'visible' });
    await this.createFolderHeaderButton.click();
  }

  async typeInFolderName(folderName: string) {
    await this.folderCreationModal.waitFor({ state: 'visible' });
    const modalTitle = await this.newFolderModalTitle.textContent();
    expect(modalTitle).toEqual('New folder');
    const inputTitle = await this.inputTitle.textContent();
    expect(inputTitle).toEqual('Name');
    const inputPlaceholder = await this.nameInput.getAttribute('placeholder');
    expect(inputPlaceholder).toEqual('Untitled folder');
    await this.nameInput.fill(folderName);
  }

  async clickOnCreateFolder(folderName: string) {
    await this.createFolderButton.waitFor({ state: 'visible' });
    const createButtonText = await this.createFolderButtonText.textContent();
    expect(createButtonText).toEqual('Create');
    await this.createFolderButton.click();
    await this.folderCreationModal.waitFor({ state: 'hidden' });
    const createdFolderName = await this.checkFolder(folderName);
    return createdFolderName;
  }

  async clickOnCancelFolderCreation() {
    const cancelButton = this.folderCreationModal.locator('button', { hasText: 'Cancel' });
    await cancelButton.waitFor({ state: 'visible' });
    const buttonText = await cancelButton.textContent();
    expect(buttonText).toEqual('Cancel');
    await cancelButton.click();
    await this.folderCreationModal.waitFor({ state: 'hidden', timeout: 2000 });
    return this.folderCreationModal;
  }
  async rightClickOnBody() {
    await this.driveTitle.waitFor({ state: 'visible' });
    await this.rightClickOn('body');
    await this.rightClickOnBodyModal.waitFor({ state: 'visible' });
  }

  async clickOnNewFolderContextMenu() {
    await this.contextMenuCreateFolderButton.waitFor({ state: 'visible' });
    const newFolderButtonText = await this.contextMenuCreateFolderButtonText.textContent();
    expect(newFolderButtonText).toEqual('New folder');
    const buttonSymbols = await this.contextMenuCreateFolderButtonSymbol.textContent();
    expect(buttonSymbols).toContain('F');
    await this.contextMenuCreateFolderButton.click();
  }
  async pressShiftAndF() {
    await this.page.keyboard.press('Shift+f');
  }
}
