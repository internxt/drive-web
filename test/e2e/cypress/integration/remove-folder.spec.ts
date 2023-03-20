describe('Remove Folder', () => {
  const DATA_TEST_FILE_LIST_FOLDER = '[data-test=file-list-folder]';

  beforeEach(() => {
    cy.clearLocalStorage();
    cy.login();
  });

  it('Should remove a single Folder', () => {
    cy.get(DATA_TEST_FILE_LIST_FOLDER).contains('Family').rightclick({ force: true });

    cy.contains('div[id*="headlessui-menu-item"] div', 'Move to trash').click({ force: true });

    cy.get('[data-test=file-list-folder]').contains('Family').should('not.exist');
  });

  after(() => {
    cy.get('[data-tooltip-id="createfolder-tooltip"] > .h-10').click({ force: true });

    cy.focused().clear().type('Family{enter}');
  });
});
