import { join } from 'path';

describe('Drag and drop', () => {
  const filename = 'example.txt';
  const downloadsFolder = Cypress.config('downloadsFolder');
  const fixturesFolder = Cypress.config('fixturesFolder');
  const downloadedFileFullPath = join(downloadsFolder, filename);

  beforeEach(() => {
    cy.clearLocalStorage();
    cy.login();
  });

  it('Should upload a single file to the root folder', () => {
    cy.get('[data-test=drag-and-drop-area]').attachFile(filename, { subjectType: 'drag-n-drop' });

    cy.get('[data-test=download-file-button]').click({ force: true })
      .then(() => {
        cy.readFile(join(fixturesFolder as string, filename)).then((originalFile) => {
          cy.readFile(downloadedFileFullPath).should('eq', originalFile);
        });
      });
  });

  after(() => {
    cy.task('removeFile', downloadedFileFullPath);
  });

});
