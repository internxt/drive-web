// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************
//
//
// -- This is a parent command --
// Cypress.Commands.add('login', (email, password) => { ... })
//
//
// -- This is a child command --
// Cypress.Commands.add('drag', { prevSubject: 'element'}, (subject, options) => { ... })
//
//
// -- This is a dual command --
// Cypress.Commands.add('dismiss', { prevSubject: 'optional'}, (subject, options) => { ... })
//
//
// -- This will overwrite an existing command --
// Cypress.Commands.overwrite('visit', (originalFn, url, options) => { ... })

import 'cypress-file-upload';
import path from 'path';

Cypress.Commands.add('login', () => {
  const fixturesFolder = Cypress.config('fixturesFolder');
  // You cannot have the same bridge user in both prod and dev
  const userFilename = Cypress.env('NODE_ENV') === 'production' ? 'test-user.json' : 'test-user-dev.json';

  cy.readFile(path.join(fixturesFolder, userFilename)).then((user) => {
    cy.visit('/');
    cy.get('input[name=email]').type(user.username);
    cy.get('input[name=password]').type(user.password);

    cy.get('button[type=submit]').click();

    cy.url().should('include', '/app');
  });
});
