import * as crypto from 'crypto';
import { PAGINATION_ENDPOINT_REGEX } from '../constans';

describe('Signup user', () => {
  const username = `${crypto.randomBytes(32).toString('hex')}@inxt.com`;
  const password = `Pw4${crypto.randomBytes(4).toString('hex')}`;

  beforeEach(() => {
    cy.intercept('GET', PAGINATION_ENDPOINT_REGEX.FOLDERS, (req) => {
      delete req.headers['if-none-match'];
    }).as('getFolders');
    cy.visit('/');
  });

  it('Should signup an user correctly and load folders correctly in /app', () => {
    cy.visit('/new');

    cy.contains('Create account');

    cy.get('input[name=email]').type(username);

    cy.get('input[name=password]').type(password);

    cy.get('button[type=submit]').click();

    cy.url().should('include', '/app');

    cy.wait('@getFolders', { timeout: 60000 }).then((foldersInterception) => {
      expect(foldersInterception.response.statusCode).to.equal(200);
      const foldersResponseItems = foldersInterception.response.body.result;
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
});
