import * as path from 'path';

describe('Upload file', () => {
  const filename = 'example.txt';
  const downloadsFolder = Cypress.config('downloadsFolder');
  const fixturesFolder = Cypress.config('fixturesFolder');

  beforeEach(() => {
    cy.clearLocalStorage();
    cy.login();
  });

  it('Should upload a single file', () => {
    cy.get('input[type=file]').attachFile(filename);

    cy.get('[data-test=download-file-button]').click({ force: true });

    cy.readFile(path.join(fixturesFolder as string, filename)).then((originalFile) => {
      cy.readFile(path.join(downloadsFolder, filename)).should('eq', originalFile);
    });
  });
});
