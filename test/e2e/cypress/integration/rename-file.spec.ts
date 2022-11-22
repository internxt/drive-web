describe('Rename item', () => {
  const newFolderName = 'renamed-folder';
  const newFileName = 'renamed-file';
  const ID_DROPDOWN = 'button[id="dropdown-basic"]';
  const ID_RENAME_BUTTON = 'a[id="rename"]';

  const DATA_TEST_FILE_LIST_FOLDER = '[data-test=file-list-folder]';
  const DATA_TEST_FILE_LIST_FILE = '[data-test=file-list-file]';
  beforeEach(() => {
    cy.clearLocalStorage();
    cy.login();
  });

  it('Should rename a folder item', () => {
    cy.get(DATA_TEST_FILE_LIST_FOLDER).eq(0).find(ID_DROPDOWN).click();
    cy.get(ID_RENAME_BUTTON).click({ force: true });
    cy.get(DATA_TEST_FILE_LIST_FOLDER).eq(0).find('input[type="text"]').clear().type(`${newFolderName}{enter}`);
    cy.get(DATA_TEST_FILE_LIST_FOLDER).contains(newFolderName);
  });

  it('Should rename a file item', () => {
    cy.get(DATA_TEST_FILE_LIST_FILE).eq(0).find(ID_DROPDOWN).click();
    cy.get(ID_RENAME_BUTTON).click({ force: true });

    cy.get(DATA_TEST_FILE_LIST_FILE).eq(0).find('input[type="text"]').clear().type(`${newFileName}{enter}`);

    cy.get(DATA_TEST_FILE_LIST_FILE).contains(newFileName);
  });
});
