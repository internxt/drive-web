const ID_DROPDOWN = 'button[id="dropdown-basic"]';

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
    cy.get(DATA_TEST_FILE_LIST_FOLDER).eq(0).find(ID_DROPDOWN).click();
    cy.get('a[id="rename"]').click({ force: true });
    cy.get(DATA_TEST_FILE_LIST_FOLDER).eq(0).find('input[type="text"]').clear().type(`${newFolderName}{enter}`);
    cy.get(DATA_TEST_FILE_LIST_FOLDER).contains(newFolderName);
  });

  it('Should rename a file item', () => {
    cy.get(DATA_TEST_FILE_LIST_FILE).eq(0).find(ID_DROPDOWN).click();
    cy.get('a[id="rename"]').click({ force: true });

    cy.get(DATA_TEST_FILE_LIST_FILE).eq(0).find('input[type="text"]').clear().type(`${newFileName}{enter}`);

    cy.get(DATA_TEST_FILE_LIST_FILE).contains(newFileName);
  });
});
