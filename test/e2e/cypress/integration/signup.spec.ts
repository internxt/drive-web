import * as crypto from 'crypto';

describe('Signup user', () => {
  const username = `${crypto.randomBytes(32).toString('hex')}@inxt.com`;
  const password = `Pw4${crypto.randomBytes(4).toString('hex')}`;

  beforeEach(() => {
    cy.visit('/');
  });

  it('Should signup an user correctly', () => {
    cy.visit('/new');

    cy.contains('Create account');

    cy.get('input[name=email]').type(username);

    cy.get('input[name=password]').type(password);

    cy.get('button[type=submit]').click();
  });

  it('Should redirect new users to /app', () => {
    cy.url().should('include', '/app');

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
