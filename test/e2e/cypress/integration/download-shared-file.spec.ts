import * as path from 'path';
import { menuItemsButtonsSelector } from '../constans';

describe('Download shared file', () => {
  const filename = 'example.txt';
  const downloadsFolder = Cypress.config('downloadsFolder');
  const fixturesFolder = Cypress.config('fixturesFolder');
  const { containerSelector, textToFind } = menuItemsButtonsSelector.renameButton;

  beforeEach(() => {
    cy.clearLocalStorage();
    cy.login();

    // Upload file
    cy.get('.infinite-scroll-component').then((element) => {
      if (element.text().includes(filename)) {
        // do nothing
      } else {
        cy.get('input[type=file]').attachFile(filename);
        cy.get('[data-test=file-name]').should('have.text', filename);
      }
    });
  });

  it('Should share a and download single file', () => {
    // cy.get('[data-test=file-list-file] [data-test=share-file-button]').eq(0).click({ force: true });

    cy.get('[data-test=file-list-file]').contains('example.txt').rightclick({ force: true });
    // cy.contains(containerSelector, 'Get link | Copy link').click({ force: true });
    cy.get(containerSelector).then((container) => {
      if (container.text().includes('Get link')) {
        cy.contains(containerSelector, 'Get link').click({ force: true });
      } else if (container.text().includes('Copy link')) {
        cy.contains(containerSelector, 'Copy link').click({ force: true });
      } else {
        // Si no se encuentra ninguno de los textos, se puede hacer otra acción aquí.
      }
    });
    const WAIT_SECONDS = 5000;

    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(WAIT_SECONDS);
    cy.window()
      .its('navigator.clipboard')
      .invoke('readText')
      .then((text) => {
        cy.origin(text.toString(), () => {
          cy.visit('');
          cy.window().then((win) => {
            win.addEventListener('load', () => {
              cy.contains('Download').click({ force: true });
            });
          });
        });
      });

    cy.readFile(path.join(fixturesFolder as string, filename)).then((originalFile) => {
      cy.readFile(path.join(downloadsFolder, filename)).should('eq', originalFile);
    });
  });
});
