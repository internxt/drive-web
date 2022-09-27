/// <reference types="cypress" />

declare namespace Cypress {
  interface Chainable {
    login(): Chainable;
    itemsAreLoaded(): Chainable;
  }
}
