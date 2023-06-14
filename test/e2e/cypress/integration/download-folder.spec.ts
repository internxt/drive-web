import { join } from 'path';
import { MENU_ITEM_SELECTOR } from '../constans';

describe('Download Folder', () => {
  const downloadsFolder = Cypress.config('downloadsFolder');
  const downloadedFolderFullPath = join(downloadsFolder, 'family.zip');

  beforeEach(() => {
    cy.clearLocalStorage();
    cy.login();
  });

  it('Should download a single Folder', () => {
    cy.get('[data-test=file-list-folder]').contains('Family').rightclick({ force: true });
    cy.contains(MENU_ITEM_SELECTOR, 'Download')
      .click({ force: true })
      .then(() => {
        cy.readFile(downloadedFolderFullPath);
      });
  });

  after(() => {
    cy.task('removeFile', downloadedFolderFullPath);
  });
});
