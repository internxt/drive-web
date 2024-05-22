import { FILE_ITEM_SELECTOR, MENU_ITEM_SELECTOR, PAGINATION_ENDPOINT_REGEX } from '../../constans';

describe('Share link options', () => {
  const DATA_TEST_SHARE_ITEM_DIALOG = '[data-test=share-item-dialog]';

  const SHARED_FILE_URL_FRAGMENT = 'sh/file/';

  beforeEach(() => {
    cy.clearLocalStorage();
    cy.login();
    cy.intercept('GET', PAGINATION_ENDPOINT_REGEX.FILES, (req) => {
      delete req.headers['if-none-match'];
    }).as('getFiles');
    cy.wait('@getFiles', { timeout: 60000 }).then(() => {
      cy.uploadExampleFile();
    });

    cy.get(FILE_ITEM_SELECTOR).contains('example.txt').rightclick({ force: true });
    cy.get(MENU_ITEM_SELECTOR)
      .should('be.visible')
      .then((container) => {
        if (container.text().includes('Copy link')) {
          cy.contains(MENU_ITEM_SELECTOR, 'Copy link').click({ force: true });
        } else {
          cy.get(MENU_ITEM_SELECTOR).eq(0).trigger('keydown', { keyCode: 27 });
        }
      });
  });

  it('Should copy the share link of a shared file', () => {
    cy.get(FILE_ITEM_SELECTOR).contains('example.txt').rightclick({ force: true });
    cy.contains(MENU_ITEM_SELECTOR, 'Copy link').click({ force: true });
    cy.window()
      .its('navigator.clipboard')
      .invoke('readText')
      .then((text) => {
        expect(text).contains(SHARED_FILE_URL_FRAGMENT);
      });
  });

  it('Should open the share settings modal of a shared file', () => {
    cy.get(DATA_TEST_SHARE_ITEM_DIALOG).should('not.exist');
    cy.get(FILE_ITEM_SELECTOR).contains('example.txt').rightclick({ force: true });
    cy.contains(MENU_ITEM_SELECTOR, 'Manage access').click();

    cy.get(DATA_TEST_SHARE_ITEM_DIALOG).should('exist');
  });

  after(() => {
    cy.removeExampleFile();
  });
});
