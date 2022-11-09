import { RENAMED_FOLDER_NAME } from '../constans';

describe('Remove Folder', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
    cy.login();
  });

  it('Should remove a single Folder', () => {
    cy.get('[data-test=file-list-folder]')
      .contains(RENAMED_FOLDER_NAME)
      .parents('[data-test=file-list-folder]')
      .find('[data-test=delete-folder-button]', { includeShadowDom: true })
      .click({ force: true });

    cy.get('[data-test=delete-button').click();

    cy.get('[data-test=file-list-folder]').contains(RENAMED_FOLDER_NAME).should('not.exist');
  });
});
