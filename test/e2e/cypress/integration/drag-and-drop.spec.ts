import * as path from 'path';

describe('Drag and drop', () => {
  const filename = 'example.txt';
  const downloadsFolder = Cypress.config('downloadsFolder');
  const fixturesFolder = Cypress.config('fixturesFolder');

  beforeEach(() => {
    cy.login();
  });

  it('Upload a single file to the root folder', () => {
    cy.get('[data-test=drag-and-drop-area]').attachFile(filename, { subjectType: 'drag-n-drop' });

    cy.get('[data-test=download-file-button]').click({ force: true });

    cy.readFile(path.join(fixturesFolder as string, filename)).then((originalFile) => {
      cy.readFile(path.join(downloadsFolder, filename)).should('eq', originalFile);
    });
  });
});
