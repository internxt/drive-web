import * as path from 'path';

describe('Download shared file', () => {
  const filename = 'example.txt';
  const downloadsFolder = Cypress.config('downloadsFolder');
  const fixturesFolder = Cypress.config('fixturesFolder');

  beforeEach(() => {
    cy.clearLocalStorage();
    cy.login();
  });

  it('Should share a and download single file', () => {
    cy.get('[data-test=file-list-file] [data-test=share-file-button]').eq(0).click({ force: true });

    const WAIT_SECONDS = 5000;

    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(WAIT_SECONDS);
    cy.window()
      .its('navigator.clipboard')
      .invoke('readText')
      .then((text) => {
        cy.origin(text.toString(), () => {
          cy.visit('');
          cy.contains('Download').click();
        });
      });

    cy.readFile(path.join(fixturesFolder as string, filename)).then((originalFile) => {
      cy.readFile(path.join(downloadsFolder, filename)).should('eq', originalFile);
    });
  });
});
