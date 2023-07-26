import * as path from 'path';
import { randomBytes } from 'crypto';
import { join } from 'path';
import { FILE_ITEM_SELECTOR, MENU_ITEM_SELECTOR, PAGINATION_ENDPOINT_REGEX } from '../constans';

describe('Security account tab', () => {
  const filename = 'example.txt';
  const downloadsFolder = Cypress.config('downloadsFolder');
  const fixturesFolder = Cypress.config('fixturesFolder');
  const downloadedFileFullPath = join(downloadsFolder, filename);
  const userFilename = 'test-user.json';
  const second_password = `Pw4${randomBytes(4).toString('hex')}-nla`;

  beforeEach(() => {
    Cypress.on('uncaught:exception', () => {
      // returning false here prevents Cypress from
      // failing the test on a request exception
      // We most likely want to set this globally
      return false;
    });
    cy.clearLocalStorage();
    cy.login();
    cy.intercept('GET', PAGINATION_ENDPOINT_REGEX.FILES, (req) => {
      delete req.headers['if-none-match'];
    }).as('getFiles');
    cy.wait('@getFiles', { timeout: 60000 }).then(() => {
      cy.uploadExampleFile();
    });
  });

  it('Should have valid files after changing password', () => {
    cy.visit('/preferences?tab=security');

    cy.readFile<{
      username: string;
      password: string;
    }>(path.join(fixturesFolder as string, userFilename)).then((user) => {
      cy.get('input[type=password]').type(user.password);
      cy.get('[data-test=access-button]').click();

      // Change password
      cy.get('[data-test=change-password-button]').click();
      cy.get('[data-test=new-password]').type(second_password);
      cy.get('[data-test=new-password-confirmation]').type(second_password);
      cy.get('[data-test="next-button"]').click();

      // Logout
      cy.get('#headlessui-popover-button-1').click();
      cy.get('[data-test=logout]').parent().click();

      // eslint-disable-next-line cypress/no-unnecessary-waiting
      cy.wait(10000);

      // Login
      cy.get('input[name=email]').type(user.username);
      cy.get('input[name=password]').type(second_password);
      cy.get('button[type=submit]').click();
      cy.url().should('include', '/app');

      // To not show the after signup onboarding
      cy.window().then((win) => {
        win.localStorage.setItem('signUpTutorialCompleted', 'true');
      });

      // Download file
      cy.contains(FILE_ITEM_SELECTOR, 'example').rightclick({ force: true });
      cy.contains(MENU_ITEM_SELECTOR, 'Download')
        .click({ force: true })
        .then(() => {
          // Check content
          cy.readFile(path.join(fixturesFolder as string, filename)).then((originalFile) => {
            cy.readFile(downloadedFileFullPath).should('eq', originalFile);
          });
        });
    });
  });

  after(() => {
    cy.task('removeFile', downloadedFileFullPath);
  });
});
