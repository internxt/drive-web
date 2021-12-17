import * as crypto from 'crypto';

describe('Signup user', () => {
  const username = `${crypto.randomBytes(32).toString('hex')}@inxt.com`;
  const password = `Pw4${crypto.randomBytes(4).toString('hex')}`;

  it('Should signup an user correctly', () => {
    cy.visit('/new');

    cy.contains('Create an Internxt account');

    cy.get('input[name=name]').type('e2e');
    cy.get('input[name=lastname]').type('test');

    cy.get('input[name=email]').type(username);

    cy.get('input[name=password]').type(password);
    cy.get('input[name=confirmPassword]').type(password);

    cy.get('input[name=acceptTerms]').click();
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
