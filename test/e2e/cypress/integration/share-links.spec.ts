import { FILE_ITEM_SELECTOR, MENU_ITEM_SELECTOR } from '../constans';

describe('Share link options', () => {
  const DATA_TEST_SHARE_ITEM_DIALOG = '[data-test=share-item-dialog]';

  const SHARED_FILE_URL_FRAGMENT = 'sh/file/';
  const FIVE_SECONDS = 5000;

  beforeEach(() => {
    cy.clearLocalStorage();
    cy.login();
    cy.intercept('GET', /\/folders\/\d+\/files\/\?offset=\d+&limit=\d+/, (req) => {
      delete req.headers['if-none-match'];
    }).as('getFiles');
    cy.wait('@getFiles', { timeout: 60000 }).then(() => {
      cy.uploadExampleFile();
    });

    cy.get(FILE_ITEM_SELECTOR).contains('example.txt').rightclick({ force: true });
    cy.get(MENU_ITEM_SELECTOR)
      .should('be.visible')
      .then((container) => {
        if (container.text().includes('Get link')) {
          cy.contains(MENU_ITEM_SELECTOR, 'Get link').click({ force: true });
          // eslint-disable-next-line cypress/no-unnecessary-waiting
          cy.wait(5000);
        } else {
          cy.get(MENU_ITEM_SELECTOR).eq(0).trigger('keydown', { keyCode: 27 });
        }
      });
  });

  it('Should copy the share link of a shared file', () => {
    cy.get(FILE_ITEM_SELECTOR).contains('example.txt').rightclick({ force: true });
    cy.contains(MENU_ITEM_SELECTOR, 'Copy link').click({ force: true });

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
    cy.get(FILE_ITEM_SELECTOR).contains('example.txt').rightclick({ force: true });
    cy.contains(MENU_ITEM_SELECTOR, 'Link settings').click();

    cy.get(DATA_TEST_SHARE_ITEM_DIALOG).should('exist');
  });

  it('Should delete de link of a shared file', () => {
    cy.get(FILE_ITEM_SELECTOR).contains('example.txt').rightclick({ force: true });
    cy.contains(MENU_ITEM_SELECTOR, 'Delete link').click({ force: true });

    cy.get(FILE_ITEM_SELECTOR).contains('example.txt').rightclick({ force: true });
    cy.contains(MENU_ITEM_SELECTOR, 'Get link').should('exist');
    cy.contains(MENU_ITEM_SELECTOR, 'Delete link').should('not.exist');
    cy.get(MENU_ITEM_SELECTOR).eq(0).trigger('keydown', { keyCode: 27 });
  });

  after(() => {
    cy.removeExampleFile();
  });
});
