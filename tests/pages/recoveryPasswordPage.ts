import { Page, Locator } from '@playwright/test';
import { basePage } from './basePage';

export class recoveryPasswordPage extends basePage {
  private accountRecoveryTitle: Locator;

  constructor(page: Page) {
    super(page);

    this.accountRecoveryTitle = this.page.getByRole('heading', { name: 'Account recovery' });
  }
}
