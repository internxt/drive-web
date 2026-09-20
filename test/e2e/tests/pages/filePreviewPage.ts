import { Download, expect, Locator, Page } from '@playwright/test';
import { staticData } from '../helper/staticData';

const PREVIEW_TIMEOUT = 30000;
const CONVERSION_LOADER_TEST_ID = 'image-conversion-loader';
const CLOSE_KEY = 'Escape';

export class FilePreviewPage {
  private page: Page;
  private dialog: Locator;
  private noPreviewText: Locator;
  private loadingPreviewText: Locator;
  private conversionLoader: Locator;
  private downloadButtons: Locator;
  private topBarDownloadButton: Locator;
  private fallbackDownloadButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.dialog = this.page.getByRole('dialog');
    this.noPreviewText = this.dialog.getByText(staticData.noFilePreviewText);
    this.loadingPreviewText = this.dialog.getByText(staticData.loadingPreviewText);
    this.conversionLoader = this.dialog.getByTestId(CONVERSION_LOADER_TEST_ID);
    this.downloadButtons = this.dialog.getByRole('button', { name: staticData.downloadButtonText, exact: true });
    this.topBarDownloadButton = this.downloadButtons.filter({ hasNotText: staticData.downloadButtonText });
    this.fallbackDownloadButton = this.downloadButtons.filter({ hasText: staticData.downloadButtonText });
  }

  private renderedImage(fileName: string) {
    return this.dialog.getByRole('img', { name: fileName, exact: true });
  }

  private async expectNoLoader() {
    await expect(this.loadingPreviewText).toBeHidden();
    await expect(this.conversionLoader).toBeHidden();
  }

  async expectOpen() {
    await expect(this.dialog).toBeVisible({ timeout: PREVIEW_TIMEOUT });
  }

  async expectRenderedImage(fileName: string, naturalWidth: number) {
    const image = this.renderedImage(fileName);

    await expect(image).toBeVisible({ timeout: PREVIEW_TIMEOUT });
    await expect(image).toHaveAttribute('src', staticData.blobUrlPattern);
    await expect(image).toHaveJSProperty('naturalWidth', naturalWidth);
    await expect(this.noPreviewText).toBeHidden();
    await this.expectNoLoader();
  }

  async expectNoPreviewFallback(fileName: string) {
    await expect(this.noPreviewText).toBeVisible({ timeout: PREVIEW_TIMEOUT });
    await expect(this.fallbackDownloadButton).toBeVisible();
    await this.expectNoLoader();
    await expect(this.renderedImage(fileName)).toHaveCount(0);
  }

  async downloadFromTopBar(): Promise<Download> {
    const downloadPromise = this.page.waitForEvent('download', { timeout: PREVIEW_TIMEOUT });
    await this.topBarDownloadButton.click();
    return downloadPromise;
  }

  async close() {
    await this.page.keyboard.press(CLOSE_KEY);
    await expect(this.dialog).toBeHidden();
  }
}
