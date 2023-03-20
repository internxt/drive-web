import { join } from 'path';

describe('Download Folder', () => {
  const downloadsFolder = Cypress.config('downloadsFolder');
  const downloadedFolderFullPath = join(downloadsFolder, 'family.zip');

  beforeEach(() => {
    cy.clearLocalStorage();
    cy.login();
  });

  it('Should download a single Folder', () => {
    cy.get('[data-test=file-list-folder]').contains('Family').rightclick({ force: true });
    cy.contains('div[id*="headlessui-menu-item"] div', 'Download')
      .click({ force: true })
      .then(() => {
        cy.readFile(downloadedFolderFullPath);
      });
  });

  after(() => {
    cy.task('removeFile', downloadedFolderFullPath);
  });
});
