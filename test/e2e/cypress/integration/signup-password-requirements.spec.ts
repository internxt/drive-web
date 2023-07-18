import * as crypto from 'crypto';

describe('Signup password requirements', () => {
  const username = `${crypto.randomBytes(32).toString('hex')}@inxt.com`;
  const shortPassword = 'a';
  const notComplexEnoughPassword = 'aadfdfea';
  const weakPassword = 'Testpassword';
  const strongPassword = 'Testpassword#';

  beforeEach(() => {
    cy.visit('/');
  });

  it('Should check that cannot create an account with short password', () => {
    cy.visit('/new');

    cy.contains('Create account');

    cy.get('input[name=email]').type(username);

    cy.get('input[name=password]').type(shortPassword);

    cy.get('button[type=submit]').should('be.disabled');

    cy.contains('Password has to be at least 8 characters long');
  });

  it('Should check that cannot create an account with not complex enough password', () => {
    cy.visit('/new');

    cy.contains('Create account');

    cy.get('input[name=email]').type(username);

    cy.get('input[name=password]').type(notComplexEnoughPassword);

    cy.get('button[type=submit]').should('be.disabled');

    cy.contains('Password is not complex enough');
  });

  it('Should check that it is possible to create an account with weak password', () => {
    const newUsername = `${crypto.randomBytes(32).toString('hex')}@inxt.com`;

    cy.visit('/new');

    cy.contains('Create account');

    cy.get('input[name=email]').type(newUsername);

    cy.get('input[name=password]').type(weakPassword);

    cy.get('button[type=submit]').should('be.enabled');

    cy.contains('Password is weak');

    cy.get('button[type=submit]').click();

    cy.url().should('include', '/app');
  });

  it('Should check that it is possible to create an account with strong password', () => {
    const newUsername = `${crypto.randomBytes(32).toString('hex')}@inxt.com`;

    cy.visit('/new');

    cy.contains('Create account');

    cy.get('input[name=email]').type(newUsername);

    cy.get('input[name=password]').type(strongPassword);

    cy.get('button[type=submit]').should('be.enabled');

    cy.contains('Password is strong');

    cy.get('button[type=submit]').click();

    cy.url().should('include', '/app');
  });
});
