import { join } from 'path';
import { EXAMPLE_FOLDERNAME, FOLDER_ITEM_SELECTOR, MENU_ITEM_SELECTOR } from '../constans';

describe('Move folder', () => {
  const downloadsFolder = Cypress.config('downloadsFolder');
  const movedFolderFullPath = join(downloadsFolder, EXAMPLE_FOLDERNAME);

  beforeEach(() => {
    cy.clearLocalStorage();
    cy.login();
    cy.get('.infinite-scroll-component').then((element) => {
      if (element.text().includes(EXAMPLE_FOLDERNAME)) {
        cy.removeExampleFolder();
      }
    });
  });

  it('Should display just the name when moving folder', () => {
    cy.createFolder(EXAMPLE_FOLDERNAME);

    cy.moveFolder(EXAMPLE_FOLDERNAME);

    cy.shouldNotFindFolder(EXAMPLE_FOLDERNAME);
    cy.shouldFindLoggerText(EXAMPLE_FOLDERNAME);
  });
});
