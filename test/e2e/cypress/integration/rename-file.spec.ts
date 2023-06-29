import { FILE_ITEM_SELECTOR, MENU_ITEM_SELECTOR, PAGINATION_ENDPOINT_REGEX } from '../constans';

describe('Rename item', () => {
  const newFolderName = 'new-folder';
  const newFileName = 'new-file';
  const renameText = 'Rename';

  const DATA_TEST_FILE_LIST_FOLDER = '[data-test=file-list-folder]';

  beforeEach(() => {
    cy.intercept('GET', PAGINATION_ENDPOINT_REGEX.FILES, (req) => {
      delete req.headers['if-none-match'];
    }).as('getFiles');
    cy.clearLocalStorage();
    cy.login();
    cy.wait('@getFiles', { timeout: 60000 }).then(() => {
      cy.uploadExampleFile();
    });
  });

  it('Should rename a folder item', () => {
    cy.get(DATA_TEST_FILE_LIST_FOLDER).contains('Family').rightclick({ force: true });
    cy.contains(MENU_ITEM_SELECTOR, renameText).click({ force: true });
    cy.focused().clear().type(`${newFolderName}{enter}`);

    cy.reload();

    cy.get(DATA_TEST_FILE_LIST_FOLDER).contains(newFolderName).should('exist');

    cy.get(DATA_TEST_FILE_LIST_FOLDER).contains(newFolderName).rightclick({ force: true });
    cy.contains(MENU_ITEM_SELECTOR, renameText).click({ force: true });
    cy.focused().clear().type('Family{enter}');

    cy.get(DATA_TEST_FILE_LIST_FOLDER).contains('Family').should('exist');
  });

  it('Should rename a file item', () => {
    cy.get(FILE_ITEM_SELECTOR).contains('example.txt').rightclick({ force: true });
    cy.contains(MENU_ITEM_SELECTOR, renameText).click({ force: true });
    cy.focused().clear().type(`${newFileName}{enter}`);

    cy.get(FILE_ITEM_SELECTOR).contains(newFileName).should('exist');

    cy.get(FILE_ITEM_SELECTOR).contains(newFileName).rightclick({ force: true });
    cy.contains(MENU_ITEM_SELECTOR, renameText).click({ force: true });
    cy.focused().clear().type('example{enter}');

    cy.get(FILE_ITEM_SELECTOR).contains('example.txt').should('exist');
  });
});
