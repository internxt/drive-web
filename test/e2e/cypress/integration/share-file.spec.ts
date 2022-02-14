import * as path from 'path';

describe('Share file', () => {
  const filename = 'example.txt';
  const downloadsFolder = Cypress.config('downloadsFolder');
  const fixturesFolder = Cypress.config('fixturesFolder');

  beforeEach(() => {
    cy.clearLocalStorage();
    cy.login();
  });

  it('Should share a single file', () => {
    cy.get('[data-test=file-list-file] [data-test=share-file-button]').click({ force: true });

    cy.contains('http')
      .invoke('text')
      .then((urlText) => {
        cy.visit(urlText.toString());
        cy.contains('Download').click();

        cy.readFile(path.join(fixturesFolder as string, filename)).then((originalFile) => {
          cy.readFile(path.join(downloadsFolder, filename)).should('eq', originalFile);
        });
      });
  });

});
