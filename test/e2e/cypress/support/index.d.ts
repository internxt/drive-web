/// <reference types="cypress" />

declare namespace Cypress {
  interface Chainable {
    login(enableOnboarding?: boolean): Chainable;
    removeExampleFile(): Chainable;
    removeExampleFolder(): Chainable;
    uploadExampleFile(): Chainable;
    createFolder(folderName: string): Chainable;
    moveFolder(folderName: string): Chainable;
    shouldNotFindFolder(folderName: string): Chainable;
    shouldFindLoggerText(folderName: string): Chainable;
  }
}
