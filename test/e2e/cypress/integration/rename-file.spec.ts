const CLASS_FILE_LIST_ITEM_NAME = '.file-list-item-name';
const CLASS_ITEM_RENAME_BUTTON = '.file-list-item-edit-name-button';

const DATA_TEST_FILE_LIST_FOLDER = '[data-test=file-list-folder]';
const DATA_TEST_FILE_LIST_FILE = '[data-test=file-list-file]';

describe('Rename item', () => {
  const newFolderName = 'renamed-folder';
  const newFileName = 'renamed-file';

  beforeEach(() => {
    cy.clearLocalStorage();
    cy.login();
  });

  it('Should rename a folder item', () => {
    cy.get(DATA_TEST_FILE_LIST_FOLDER)
      .eq(0)
      .find(CLASS_FILE_LIST_ITEM_NAME)
      .find(CLASS_ITEM_RENAME_BUTTON)
      .click({ force: true });
    cy.get(DATA_TEST_FILE_LIST_FOLDER).eq(0).find('input[type="text"]').clear().type(`${newFolderName}{enter}`);
    cy.get(DATA_TEST_FILE_LIST_FOLDER).contains(newFolderName);
  });

  it('Should rename a file item', () => {
    cy.get(DATA_TEST_FILE_LIST_FILE)
      .eq(0)
      .find(CLASS_FILE_LIST_ITEM_NAME)
      .find(CLASS_ITEM_RENAME_BUTTON)
      .click({ force: true });

    cy.get(DATA_TEST_FILE_LIST_FILE).eq(0).find('input[type="text"]').clear().type(`${newFileName}{enter}`);

    cy.get(DATA_TEST_FILE_LIST_FILE).contains(newFileName);
  });
});
