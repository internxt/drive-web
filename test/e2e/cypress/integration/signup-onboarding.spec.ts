import { EXAMPLE_FILENAME, MENU_ITEM_SELECTOR } from '../constans';

describe('Signup onboarding', () => {
  const DATA_TEST_FILE_LIST_FILE = '[data-test=file-list-file]';

  beforeEach(() => {
    cy.login(true);
  });

  it('Should check that onboarding is working', () => {
    cy.get('.cursor-pointer > .absolute').click();

    cy.get('input[type=file]').attachFile(EXAMPLE_FILENAME);

    cy.contains('File uploaded');

    cy.get('[data-test=download-desktop-modal]').should('exist');

    cy.get('[data-test=download-desktop-modal-close-button]').click();

    cy.get('[data-test=download-desktop-modal]').should('not.exist');
  });

  after(() => {
    cy.get(DATA_TEST_FILE_LIST_FILE).contains('example').rightclick({ force: true });
    cy.contains(MENU_ITEM_SELECTOR, 'Move to trash').click({ force: true });
    cy.get(DATA_TEST_FILE_LIST_FILE).contains('example').should('not.exist');
  });
});
