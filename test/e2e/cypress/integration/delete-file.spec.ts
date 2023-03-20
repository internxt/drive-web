import { EXAMPLE_FILENAME } from '../constans';

describe('Delete file', () => {
  const DATA_TEST_FILE_LIST_FILE = '[data-test=file-list-file]';
  const filename = 'example.txt';

  beforeEach(() => {
    cy.login();

    cy.get('.infinite-scroll-component').then((element) => {
      if (element.text().includes(filename)) {
        // do nothing
      } else {
        cy.get('input[type=file]').attachFile(filename);
        cy.get('[data-test=file-name]').should('have.text', filename);
      }
    });
  });

  it('Should delete a single file', () => {
    cy.get(DATA_TEST_FILE_LIST_FILE).contains(EXAMPLE_FILENAME).rightclick({ force: true });
    cy.contains('div[id*="headlessui-menu-item"] div', 'Move to trash').click({ force: true });
    cy.get(DATA_TEST_FILE_LIST_FILE).should('not.exist');
  });
});
