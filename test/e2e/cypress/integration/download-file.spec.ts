import { join } from 'path';
import { MENU_ITEM_SELECTOR } from '../constans';

describe('Download file', () => {
  const filename = 'example.txt';
  const downloadsFolder = Cypress.config('downloadsFolder');
  const fixturesFolder = Cypress.config('fixturesFolder');
  const downloadedFileFullPath = join(downloadsFolder, filename);

  beforeEach(() => {
    cy.clearLocalStorage();
    cy.login();

    // Upload file
    cy.get('.infinite-scroll-component').then((element) => {
      if (element.text().includes(filename)) {
        // do nothing
      } else {
        cy.get('input[type=file]').attachFile(filename);
        cy.get('[data-test=file-name]').should('have.text', filename);
      }
    });
  });

  it('Should download a single file', () => {
    cy.contains('[data-test="file-list-file"]', 'example').rightclick({ force: true });
    cy.contains(MENU_ITEM_SELECTOR, 'Download')
      .click({ force: true })
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
