import * as crypto from 'crypto';

import { EXAMPLE_FILENAME, MENU_ITEM_SELECTOR, PAGINATION_ENDPOINT_REGEX } from '../../constans';

describe('Signup user', () => {
  const username = `${crypto.randomBytes(32).toString('hex')}@inxt.com`;
  const password = `Pw4${crypto.randomBytes(4).toString('hex')}`;
  const DATA_TEST_FILE_LIST_FILE = '[data-test=file-list-file]';

  beforeEach(() => {
    cy.intercept('GET', PAGINATION_ENDPOINT_REGEX.FOLDERS, (req) => {
      delete req.headers['if-none-match'];
    }).as('getFolders');
  });

  it('Should signup an user correctly and load folders correctly in /', () => {
    cy.visit('/new');

    cy.contains('Create account');

    cy.get('input[name=email]').type(username);

    cy.get('input[name=password]').type(password);

    cy.get('button[type=submit]').click();

    cy.url().should('contains', Cypress.config().baseUrl);

    cy.wait('@getFolders', { timeout: 60000 }).then((foldersInterception) => {
      expect(foldersInterception.response?.statusCode).to.equal(200);
      const foldersResponseItems = foldersInterception?.response?.body.result;
      expect(foldersResponseItems).to.have.lengthOf(2);
    });

    cy.writeFile(
      './cypress/fixtures/test-user.json',
      JSON.stringify({
        username,
        password,
      }),
      {
        flag: 'w',
      },
    );
  });

  it('Should check that onboarding is working', () => {
    cy.login(true);

    cy.get('.cursor-pointer > .absolute').click();

    cy.get('input[type=file]').attachFile(EXAMPLE_FILENAME);

    cy.contains('example.txt');

    cy.get('[data-test=download-desktop-modal]').should('exist');

    cy.get('[data-test=download-desktop-modal-close-button]').click();

    cy.get('[data-test=download-desktop-modal]').should('not.exist');
  });

  after(() => {
    cy.get(DATA_TEST_FILE_LIST_FILE).contains('example').rightclick({ force: true });
    cy.contains(MENU_ITEM_SELECTOR, 'Move to trash').click({ force: true });
    cy.get(DATA_TEST_FILE_LIST_FILE).find('example').should('not.exist');
  });
});
