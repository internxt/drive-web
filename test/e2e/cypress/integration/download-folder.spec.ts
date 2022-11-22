import { join } from 'path';
import { RENAMED_FOLDER_NAME } from '../constans';

describe('Download Folder', () => {
  const downloadsFolder = Cypress.config('downloadsFolder');
  const downloadedFolderFullPath = join(downloadsFolder, `${RENAMED_FOLDER_NAME}.zip`);

  beforeEach(() => {
    cy.clearLocalStorage();
    cy.login();
  });

  it('Should download a single Folder', () => {
    cy.get('[data-test=file-list-folder]')
      .contains(RENAMED_FOLDER_NAME)
      .parents('[data-test=file-list-folder]')
      .find('[data-test=download-folder-button]', { includeShadowDom: true })
      .click({ force: true })
      .then(() => {
        cy.readFile(downloadedFolderFullPath);
      });
  });

  after(() => {
    cy.task('removeFile', downloadedFolderFullPath);
  });
});
