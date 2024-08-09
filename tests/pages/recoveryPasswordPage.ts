import { Page, expect, Locator } from '@playwright/test';
import { accountRecoveryLocators } from '../locators/accountRecovery';
import { basePage } from './basePage';

export class recoveryPasswordPage extends basePage {
  private accountRecoveryTitle: Locator;

  constructor(page: Page) {
    super(page);

    this.accountRecoveryTitle = this.page.locator(accountRecoveryLocators.accountRecoveryTitle);
  }
}
