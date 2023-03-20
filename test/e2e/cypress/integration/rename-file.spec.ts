import { EXAMPLE_FILENAME, FILE_ITEM_SELECTOR, MENU_ITEM_SELECTOR } from '../constans';

describe('Rename item', () => {
  const newFolderName = 'new-folder';
  const newFileName = 'new-file';
  const renameText = 'Rename';

  const DATA_TEST_FILE_LIST_FOLDER = '[data-test=file-list-folder]';

  beforeEach(() => {
    cy.clearLocalStorage();
    cy.login();
    // Upload file
    cy.get('.infinite-scroll-component').then((element) => {
      if (element.text().includes(EXAMPLE_FILENAME)) {
        // do nothing
      } else {
        cy.get('input[type=file]').attachFile(EXAMPLE_FILENAME);
        cy.get('[data-test=file-name]').should('have.text', EXAMPLE_FILENAME);
      }
    });
  });

  it('Should rename a folder item', () => {
    cy.get(DATA_TEST_FILE_LIST_FOLDER).contains('Family').rightclick({ force: true });
    cy.contains(MENU_ITEM_SELECTOR, renameText).click({ force: true });
    cy.focused().clear().type(`${newFolderName}{enter}`);

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
