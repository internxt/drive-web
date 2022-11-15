import * as path from 'path';
import { randomBytes } from 'crypto';
import { join } from 'path';

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
    // Upload file
    cy.get('input[type=file]').attachFile(filename);
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
      cy.contains('Next').click();

      // Logout
      cy.get('#headlessui-popover-button-2').click();
      cy.get('[data-test=logout]').parent().click();

      // Login
      cy.get('input[name=email]').type(user.username);
      cy.get('input[name=password]').type(second_password);
      cy.get('button[type=submit]').click();
      cy.url().should('include', '/app');

      // Download file
      cy.get('[data-test=download-file-button]')
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
