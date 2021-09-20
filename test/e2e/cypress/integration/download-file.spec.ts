import * as path from 'path';

describe('Download file', () => {
  const filename = 'example.txt';
  const downloadsFolder = Cypress.config('downloadsFolder');
  const fixturesFolder = Cypress.config('fixturesFolder');

  beforeEach(() => {
    cy.clearLocalStorage();
    cy.login();
  });

  it('Should download a single file', () => {
    cy.get('[data-test=download-file-button]').click({ force: true });

    cy.readFile(path.join(fixturesFolder as string, filename)).then((originalFile) => {
      cy.readFile(path.join(downloadsFolder, filename)).should('eq', originalFile);
    });
  });
});
