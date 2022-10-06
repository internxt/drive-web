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
    cy.clearLocalStorage();
    cy.login();
  });

  it('Should have valid files after changing password', () => {
    cy.visit('/account?tab=security');

    cy.readFile<{
      username: string,
      password: string,
    }>(path.join(fixturesFolder as string, userFilename))
      .then(user => {
          // Change password
          cy.get('input[name=currentPassword]').type(user.password);
          cy.get('input[name=password]').type(second_password);
          cy.get('input[name=confirmPassword]').type(second_password);
          cy.get('button.change-password-button').click();

          // Logout
          cy.get('#headlessui-popover-button-2').click();
          cy.get('[data-test=logout]').parent().click();

          // Login
          cy.get('input[name=email]').type(user.username);
          cy.get('input[name=password]').type(second_password);
          cy.get('button[type=submit]').click();
          cy.url().should('include', '/app');

          // Download file
          cy.get('[data-test=download-file-button]').click({ force: true })
            .then(() => {
              // Check content
              cy.readFile(path.join(fixturesFolder as string, filename))
                .then((originalFile) => {
                  cy.readFile(downloadedFileFullPath).should('eq', originalFile);
                });
            });
        }
      );
  });

  after(() => {
    cy.task('removeFile', downloadedFileFullPath);
  });

});
