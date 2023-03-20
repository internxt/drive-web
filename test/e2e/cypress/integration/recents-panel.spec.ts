import { join } from 'path';
import { EXAMPLE_FILENAME } from '../constans';

describe('Recents panel', () => {
  const filenameRenamed = 'example2';
  const downloadsFolder = Cypress.config('downloadsFolder');
  const fixturesFolder = Cypress.config('fixturesFolder');
  const downloadedFileFullPath = join(downloadsFolder, EXAMPLE_FILENAME);

  beforeEach(() => {
    cy.clearLocalStorage();
    cy.login();

    // Upload file
    cy.get('.infinite-scroll-component').then((element) => {
      if (element.text().includes(EXAMPLE_FILENAME)) {
        // do nothing
      } else {
        cy.get('input[type=file]').attachFile(EXAMPLE_FILENAME);
        cy.get('[data-test=file-name]').should('have.text', EXAMPLE_FILENAME);
      }
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
    cy.contains('div[id*="headlessui-menu-item"] div', 'Delete link').click();
    cy.get('#list-item-menu-button').click();
    cy.contains('div[id*="headlessui-menu-item"] div', 'Delete link').should('not.exist');
  });

  it('Should download a single file', () => {
    cy.get('#list-item-menu-button').click();
    cy.contains('div[id*="headlessui-menu-item"] div', 'Download')
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
    cy.contains('div[id*="headlessui-menu-item"] div', 'Rename').click();
    cy.get('input[name=fileName]').clear().type(filenameRenamed).type('{enter}');
    cy.contains(filenameRenamed);
  });

  after(() => {
    //RENAME AGAIN THE FILE
    cy.get('#list-item-menu-button').click();
    cy.contains('div[id*="headlessui-menu-item"] div', 'Rename').click();
    cy.get('input[name=fileName]').clear().type('example').type('{enter}');
  });
});
