import { join } from 'path';
import { FILE_ITEM_SELECTOR } from '../constans';

describe('Drag and drop', () => {
  const filename = 'example.txt';
  const downloadsFolder = Cypress.config('downloadsFolder');
  const fixturesFolder = Cypress.config('fixturesFolder');
  const downloadedFileFullPath = join(downloadsFolder, filename);

  beforeEach(() => {
    cy.clearLocalStorage();
    cy.login();
    cy.get('.infinite-scroll-component').then((element) => {
      if (element.text().includes(filename)) {
        cy.removeExampleFile();
      }
    });
  });

  it('Should upload a single file to the root folder', () => {
    cy.get('[data-test=drag-and-drop-area]').attachFile(filename, { subjectType: 'drag-n-drop' });

    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(10000);
    cy.get(FILE_ITEM_SELECTOR).contains('example.txt').rightclick({ force: true });
    cy.contains('div[id*="headlessui-menu-item"] div', 'Download')
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
