import { join } from 'path';

describe('Download file', () => {
  const filename = 'example.txt';
  const downloadsFolder = Cypress.config('downloadsFolder');
  const fixturesFolder = Cypress.config('fixturesFolder');
  const downloadedFileFullPath = join(downloadsFolder, filename);

  beforeEach(() => {
    cy.clearLocalStorage();
    cy.login();
  });

  it('Should download a single file', () => {
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
