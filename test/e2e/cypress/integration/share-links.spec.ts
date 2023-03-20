import { EXAMPLE_FILENAME } from '../constans';

describe('Share link options', () => {
  const DATA_TEST_FILE_LIST_FILE = '[data-test=file-list-file]';
  const DATA_TEST_SHARE_ITEM_DIALOG = '[data-test=share-item-dialog]';

  const SHARED_FILE_URL_FRAGMENT = 'sh/file/';
  const FIVE_SECONDS = 5000;

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
    cy.get(DATA_TEST_FILE_LIST_FILE).contains('example.txt').rightclick({ force: true });
    cy.get('div[id*="headlessui-menu-item"] div')
      .should('be.visible')
      .then((container) => {
        if (container.text().includes('Get link')) {
          cy.contains('div[id*="headlessui-menu-item"] div', 'Get link').click({ force: true });
          // eslint-disable-next-line cypress/no-unnecessary-waiting
          cy.wait(5000);
        } else {
          cy.get('div[id*="headlessui-menu-item"] div').eq(0).trigger('keydown', { keyCode: 27 });
        }
      });
  });

  it('Should copy the share link of a shared file', () => {
    cy.get(DATA_TEST_FILE_LIST_FILE).contains('example.txt').rightclick({ force: true });
    cy.contains('div[id*="headlessui-menu-item"] div', 'Copy link').click({ force: true });

    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(FIVE_SECONDS);
    cy.window()
      .its('navigator.clipboard')
      .invoke('readText')
      .then((text) => {
        expect(text).contains(SHARED_FILE_URL_FRAGMENT);
      });
  });

  it('Should open the share settings modal of a shared file', () => {
    cy.get(DATA_TEST_SHARE_ITEM_DIALOG).should('not.exist');
    cy.get(DATA_TEST_FILE_LIST_FILE).contains('example.txt').rightclick({ force: true });
    cy.contains('div[id*="headlessui-menu-item"] div', 'Link settings').click();

    cy.get(DATA_TEST_SHARE_ITEM_DIALOG).should('exist');
  });

  it('Should delete de link of a shared file', () => {
    cy.get(DATA_TEST_FILE_LIST_FILE).contains('example.txt').rightclick({ force: true });
    cy.contains('div[id*="headlessui-menu-item"] div', 'Delete link').click({ force: true });

    cy.get(DATA_TEST_FILE_LIST_FILE).contains('example.txt').rightclick({ force: true });
    cy.contains('div[id*="headlessui-menu-item"] div', 'Get link').should('exist');
    cy.contains('div[id*="headlessui-menu-item"] div', 'Delete link').should('not.exist');
    cy.get('div[id*="headlessui-menu-item"] div').eq(0).trigger('keydown', { keyCode: 27 });
  });

  after(() => {
    cy.removeExampleFile();
  });
});
