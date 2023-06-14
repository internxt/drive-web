/// <reference types="cypress" />

declare namespace Cypress {
  interface Chainable {
    login(): Chainable;
    removeExampleFile(): Chainable;
    uploadExampleFile(): Chainable;
  }
}
