import crypto from 'crypto';

it('should signup an user correctly', () => {
  const username = `${crypto.randomBytes(8).toString('hex')}@inxt.com`;
  // Password requires at least an uppercase, a lowercase and a number
  const password = `Pw4${crypto.randomBytes(4).toString('hex')}`;
  cy.visit('/');
  cy.contains('Get started').click();

  cy.contains('Create an Internxt account');

  cy.get('input[name=name]').type('e2e');
  cy.get('input[name=lastname]').type('test');

  cy.get('input[name=email]').type(username);

  cy.get('input[name=password]').type(password);
  cy.get('input[name=confirmPassword]').type(password);

  cy.get('input[name=acceptTerms]').click();
  cy.get('button[type=submit]').click();

  cy.url().should('include', '/drive');

  cy.contains('Upload');
  cy.contains('Usage');
});
