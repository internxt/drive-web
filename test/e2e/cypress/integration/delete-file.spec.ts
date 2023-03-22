import { EXAMPLE_FILENAME, MENU_ITEM_SELECTOR } from '../constans';

describe('Delete file', () => {
  const DATA_TEST_FILE_LIST_FILE = '[data-test=file-list-file]';

  beforeEach(() => {
    cy.login();
    cy.uploadExampleFile();
  });

  it('Should delete a single file', () => {
    cy.get(DATA_TEST_FILE_LIST_FILE).contains(EXAMPLE_FILENAME).rightclick({ force: true });
    cy.contains(MENU_ITEM_SELECTOR, 'Move to trash').click({ force: true });
    cy.get(DATA_TEST_FILE_LIST_FILE).should('not.exist');
  });
});
