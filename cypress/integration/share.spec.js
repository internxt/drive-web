import path from 'path';

describe('share flow', () => {
  const filename = 'example.txt';
  const downloadsFolder = Cypress.config('downloadsFolder');
  const fixturesFolder = Cypress.config('fixturesFolder');

  beforeEach(() => {
    cy.login();
  });

  afterEach(() => {
    cy.readFile(path.join(fixturesFolder, filename)).then((originalFile) => {
      cy.readFile(path.join(downloadsFolder, filename)).should('eq', originalFile);
      cy.visit('/');
    });
    cy.get('[data-test=file-list-file] [data-test=delete-file-button]').click({ force: true });
    cy.get('button.primary:contains(Delete)').click();
  });

  it('should upload, share and download', () => {
    cy.get('input[type=file]').attachFile(filename);
    cy.get('[data-test=file-list-file] [data-test=share-file-button]').click({ force: true });

    cy.contains('http')
      .invoke('text')
      .then((urlText) => {
        cy.visit(urlText.toString());
        cy.contains('Access File').click();
        cy.contains('Download').click();
      });
  });
});
