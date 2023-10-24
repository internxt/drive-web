/// <reference types="cypress" />

declare namespace Cypress {
  interface Chainable {
    login(enableOnboarding?: boolean): Chainable;
    removeExampleFile(): Chainable;
    uploadExampleFile(): Chainable;
  }
}
