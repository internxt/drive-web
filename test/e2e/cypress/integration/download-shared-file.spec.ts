import * as path from 'path';
import { FILE_ITEM_SELECTOR, MENU_ITEM_SELECTOR, PAGINATION_ENDPOINT_REGEX } from '../constans';

describe('Download shared file', () => {
  const filename = 'example.txt';
  const downloadsFolder = Cypress.config('downloadsFolder');
  const fixturesFolder = Cypress.config('fixturesFolder');

  beforeEach(() => {
    cy.clearLocalStorage();
    cy.login();
    cy.intercept('GET', PAGINATION_ENDPOINT_REGEX.FILES, (req) => {
      delete req.headers['if-none-match'];
    }).as('getFiles');
    cy.wait('@getFiles', { timeout: 60000 }).then(() => {
      cy.uploadExampleFile();
    });
  });

  it('Should share a and download single file', () => {
    cy.get(FILE_ITEM_SELECTOR).contains('example.txt').rightclick({ force: true });

    cy.get(MENU_ITEM_SELECTOR).then((container) => {
      if (container.text().includes('Get link')) {
        cy.contains(MENU_ITEM_SELECTOR, 'Get link').click({ force: true });
      } else if (container.text().includes('Copy link')) {
        cy.contains(MENU_ITEM_SELECTOR, 'Copy link').click({ force: true });
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
