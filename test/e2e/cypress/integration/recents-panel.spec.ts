import { join } from 'path';
import { EXAMPLE_FILENAME, MENU_ITEM_SELECTOR, PAGINATION_ENDPOINT_REGEX } from '../constans';

describe('Recents panel', () => {
  const filenameRenamed = 'example2';
  const downloadsFolder = Cypress.config('downloadsFolder');
  const fixturesFolder = Cypress.config('fixturesFolder');
  const downloadedFileFullPath = join(downloadsFolder, EXAMPLE_FILENAME);

  beforeEach(() => {
    cy.clearLocalStorage();
    cy.login();
    cy.intercept('GET', PAGINATION_ENDPOINT_REGEX.FILES, (req) => {
      delete req.headers['if-none-match'];
    }).as('getFiles');
    cy.wait('@getFiles', { timeout: 60000 }).then(() => {
      cy.uploadExampleFile();
    });
    cy.visit('/app/recents');
  });

  it('Should list recents', () => {
    cy.contains('example.txt');
  });

  it('Should get link', () => {
    cy.get('#list-item-menu-button').click();
    cy.contains('div[id*="headlessui-menu-item"] span', 'Get link').click();

    // If the link has been created the delete link is displayed
    cy.get('#list-item-menu-button').click();
    cy.contains('Delete link');
  });

  it('Should delete shared link', () => {
    cy.get('#list-item-menu-button').click();
    cy.contains('div[id*="headlessui-menu-item"] span', 'Get link').click();
    cy.get('#list-item-menu-button').click();
    cy.contains(MENU_ITEM_SELECTOR, 'Delete link').click();
    cy.get('#list-item-menu-button').click();
    cy.contains(MENU_ITEM_SELECTOR, 'Delete link').should('not.exist');
  });

  it('Should download a single file', () => {
    cy.get('#list-item-menu-button').click();
    cy.contains(MENU_ITEM_SELECTOR, 'Download')
      .click({ force: true })
      .then(() => {
        cy.readFile(join(fixturesFolder as string, EXAMPLE_FILENAME)).then((originalFile) => {
          cy.readFile(downloadedFileFullPath).should('eq', originalFile);
        });
      });
  });

  after(() => {
    cy.task('removeFile', downloadedFileFullPath);
  });

  it('Should rename file', () => {
    cy.get('#list-item-menu-button').click();
    cy.contains(MENU_ITEM_SELECTOR, 'Rename').click();
    cy.get('input[name=fileName]').clear().type(filenameRenamed).type('{enter}');
    cy.contains(filenameRenamed);
  });

  after(() => {
    //RENAME AGAIN THE FILE
    cy.get('#list-item-menu-button').click();
    cy.contains(MENU_ITEM_SELECTOR, 'Rename').click();
    cy.get('input[name=fileName]').clear().type('example').type('{enter}');
  });
});
