import path from 'path';

it('upload/download flow', () => {
  const filename = 'example.txt';
  const downloadsFolder = Cypress.config('downloadsFolder');
  const fixturesFolder = Cypress.config('fixturesFolder');

  cy.get('input[type=file]').attachFile(filename);
  cy.get('[data-test=download-file-button]').click({ force:true });

  cy.readFile(path.join(fixturesFolder, filename)).then(originalFile => {
    cy.readFile(path.join(downloadsFolder, filename)).should('eq', originalFile);
  });
});