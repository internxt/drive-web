import path from 'path';

describe('upload/download flows', () => {
  const filename = 'example.txt';
  const downloadsFolder = Cypress.config('downloadsFolder');
  const fixturesFolder = Cypress.config('fixturesFolder');

  afterEach(() => {
    cy.readFile(path.join(fixturesFolder, filename)).then((originalFile) => {
      cy.readFile(path.join(downloadsFolder, filename)).should('eq', originalFile);
    });
    cy.get('[data-test=file-list-file] [data-test=delete-file-button]').click({ force: true });
    cy.get('button.primary:contains(Delete)').click();
  });

  it('upload/download flow', () => {
    cy.get('input[type=file]').attachFile(filename);
    cy.get('[data-test=download-file-button]').click({ force: true });
  });

  it('upload/download flow (with drag and drop)', () => {
    cy.get('[data-test=drag-and-drop-area]').attachFile(filename, { subjectType: 'drag-n-drop' });

    cy.get('[data-test=download-file-button]').click({ force: true });
  });
});
