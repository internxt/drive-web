/// <reference types="cypress" />
declare namespace Cypress {
  interface Chainable {
    // Register here your commands so Typescript can pick them correctly
    // See https://docs.cypress.io/guides/tooling/typescript-support#Types-for-Custom-Commands for reference

    /**
     * Goes to the signin page and signs in using the given credentials
     *
     * @param email Email to sign in into the app
     * @param password Password to sign in into the app
     */
    Login(email: string, password: string): Chainable<any>;
  }
}
