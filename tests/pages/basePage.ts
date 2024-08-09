import { Page, expect } from '@playwright/test';

export class basePage {
  protected readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async loadWeb(url: string) {
    await this.page.goto(url);
    await expect(this.page).toHaveURL(url);
  }
  async typeIn(selector: string, content: string) {
    await this.page.locator(selector).fill(content);
  }
  async clickOn(selector: string) {
    await this.page.locator(selector).click();
  }

  async assertText(actualText: string, expectedText: string) {
    expect(actualText).toEqual(expectedText);
  }
}
