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
import * as path from 'path';

Cypress.Commands.add('login', () => {
  const fixturesFolder = Cypress.config('fixturesFolder');
  const userFilename = 'test-user.json';

  cy.readFile<{ username: string; password: string }>(path.join(fixturesFolder as string, userFilename)).then(
    (user) => {
      cy.visit('/login');
      cy.get('input[name=email]').type(user.username);
      cy.get('input[name=password]').type(user.password);

      cy.get('button[type=submit]').click();

      cy.url().should('include', '/app');
    },
  );
});

Cypress.Commands.add('itemsAreLoaded', () => {
  cy.get('.file-list-item:first-child .file-list-item-name-span').should('be.visible');
});
