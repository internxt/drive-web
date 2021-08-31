// ***********************************************************
// This example support/index.js is processed and
// loaded automatically before your test files.
//
// This is a great place to put global configuration and
// behavior that modifies Cypress.
//
// You can change the location of this file or turn off
// automatically serving support files with the
// 'supportFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/configuration
// ***********************************************************

// Import commands.js using ES2015 syntax:
import './commands';

// Alternatively you can use CommonJS syntax:
// require('./commands')

// create user that will be use for all the tests and login with it
before(() => {
  cy.visit('/');
  cy.contains('Get started').click();

  cy.contains('Create an Internxt account');

  cy.get('input[name=name]').type('e2e');
  cy.get('input[name=lastname]').type('test');

  cy.get('input[name=email]').type(Cypress.env('inxtUser'));

  cy.get('input[name=password]').type(Cypress.env('inxtPassword'));
  cy.get('input[name=confirmPassword]').type(Cypress.env('inxtPassword'));

  cy.get('input[name=acceptTerms]').click();
  cy.get('button[type=submit]').click();

  cy.url().should('include', '/app');

  cy.contains('Upload');
  cy.contains('Usage');

  cy.get('#app-header-dropdown').click();
  cy.contains('Log out').click();

  cy.get('input[name=email]').type(Cypress.env('inxtUser'));
  cy.get('input[name=password]').type(Cypress.env('inxtPassword'));

  cy.get('button[type=submit]').click();

});
