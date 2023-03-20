import { EXAMPLE_FILENAME, menuItemsButtonsSelector } from '../constans';

describe('Rename item', () => {
  const newFolderName = 'new-folder';
  const newFileName = 'new-file';

  const DATA_TEST_FILE_LIST_FOLDER = '[data-test=file-list-folder]';
  const DATA_TEST_FILE_LIST_FILE = '[data-test=file-list-file]';

  const { containerSelector, textToFind } = menuItemsButtonsSelector.renameButton;

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
    cy.contains(containerSelector, textToFind).click({ force: true });
    cy.focused().clear().type(`${newFolderName}{enter}`);

    cy.get(DATA_TEST_FILE_LIST_FOLDER).contains(newFolderName).should('exist');

    cy.get(DATA_TEST_FILE_LIST_FOLDER).contains(newFolderName).rightclick({ force: true });
    cy.contains(containerSelector, textToFind).click({ force: true });
    cy.focused().clear().type('Family{enter}');

    cy.get(DATA_TEST_FILE_LIST_FOLDER).contains('Family').should('exist');
  });

  it('Should rename a file item', () => {
    cy.get(DATA_TEST_FILE_LIST_FILE).contains('example.txt').rightclick({ force: true });
    cy.contains(containerSelector, textToFind).click({ force: true });
    cy.focused().clear().type(`${newFileName}{enter}`);

    cy.get(DATA_TEST_FILE_LIST_FILE).contains(newFileName).should('exist');

    cy.get(DATA_TEST_FILE_LIST_FILE).contains(newFileName).rightclick({ force: true });
    cy.contains(containerSelector, textToFind).click({ force: true });
    cy.focused().clear().type('example{enter}');

    cy.get(DATA_TEST_FILE_LIST_FILE).contains('example.txt').should('exist');
  });
});
