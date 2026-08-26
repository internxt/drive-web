import { expect, Locator, Page } from '@playwright/test';
import { staticData } from '../helper/staticData';

export class NameCollisionDialogPage {
  private page: Page;
  private dialog: Locator;
  private title: Locator;
  private options: Locator;
  private applyToAllLabel: Locator;
  private applyToAllCheckbox: Locator;
  private uploadButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.dialog = this.page.getByRole('dialog');
    this.title = this.dialog.getByText(staticData.collisionDialogTitle);
    this.options = this.dialog.getByRole('radio');
    this.applyToAllLabel = this.dialog.getByText(staticData.collisionApplyToAll);
    this.applyToAllCheckbox = this.dialog.locator('#apply-to-all');
    this.uploadButton = this.dialog.getByRole('button', { name: 'Upload', exact: true });
  }

  async expectOpenFor(itemName: string) {
    await expect(this.title).toBeVisible({ timeout: 10000 });
    await expect(this.dialog.getByText(`${itemName} already exists in this location`)).toBeVisible();
  }

  async expectClosed() {
    await expect(this.title).toBeHidden({ timeout: 10000 });
  }

  async expectOptions(optionNames: string[]) {
    await expect(this.options).toHaveText(optionNames);
  }

  async expectApplyToAllVisible(isVisible: boolean) {
    await expect(this.applyToAllLabel).toBeVisible({ visible: isVisible });
  }

  async selectOption(optionName: string) {
    await this.dialog.getByRole('radio', { name: optionName }).click();
  }

  async checkApplyToAllByClickingLabel() {
    await this.applyToAllLabel.click();
    await expect(this.applyToAllCheckbox).toBeChecked();
  }

  async submit() {
    await expect(this.uploadButton).toBeVisible();
    await this.uploadButton.click();
  }
}
