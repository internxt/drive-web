import { Page, Locator } from '@playwright/test';

export class recoveryPasswordPage {
  private accountRecoveryTitle: Locator;
  private page: Page;
  constructor(page: Page) {
    this.page = page;

    this.accountRecoveryTitle = this.page.getByRole('heading', { name: 'Account recovery' });
  }
}
