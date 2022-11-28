describe('Share link options', () => {
  const ID_SHARE_BUTTON = 'a[id="share"]';
  const DATA_TEST_FILE_LIST_FILE = '[data-test=file-list-file]';
  const DATA_TEST_SHARE_ITEM_DIALOG = '[data-test=share-item-dialog]';
  const ID_DROPDOWN = 'button[id="dropdown-basic"]';
  const SHARED_FILE_URL_FRAGMENT = 'sh/file/';

  beforeEach(() => {
    cy.clearLocalStorage();
    cy.login();
    cy.get(DATA_TEST_FILE_LIST_FILE).eq(0).find(ID_DROPDOWN).click();
    cy.get(ID_SHARE_BUTTON).then((shareButton) => {
      if (shareButton.length === 1) {
        cy.get(ID_SHARE_BUTTON).click({ force: true });
      } else {
        cy.get(DATA_TEST_FILE_LIST_FILE).eq(0).find(ID_DROPDOWN).click();
      }
    });
  });

  it('Should copy the share link of a shared file', () => {
    cy.get(DATA_TEST_FILE_LIST_FILE).eq(0).find(ID_DROPDOWN).click();
    cy.contains('Copy link').click();

    cy.window()
      .its('navigator.clipboard')
      .invoke('readText')
      .then((text) => {
        expect(text).contains(SHARED_FILE_URL_FRAGMENT);
      });
    cy.contains('Share link copied').should('exist');
  });

  it('Should open the share settings modal of a shared file', () => {
    cy.get(DATA_TEST_SHARE_ITEM_DIALOG).should('not.exist');
    cy.get(DATA_TEST_FILE_LIST_FILE).eq(0).find(ID_DROPDOWN).click();
    cy.contains('Share settings').click();

    cy.get(DATA_TEST_SHARE_ITEM_DIALOG).should('exist');
  });

  it('Should delete de link of a shared file', () => {
    cy.contains('Link deleted').should('not.exist');

    cy.get(DATA_TEST_FILE_LIST_FILE).eq(0).find(ID_DROPDOWN).click();
    cy.get(ID_SHARE_BUTTON).then((shareButton) => {
      expect(shareButton.length).equal(3);
    });
    cy.contains('Delete link').click();

    cy.contains('Link deleted').should('exist');

    cy.get(DATA_TEST_FILE_LIST_FILE).eq(0).find(ID_DROPDOWN).click();
    cy.get(ID_SHARE_BUTTON).then((shareButton) => {
      expect(shareButton.length).equal(1);
    });
  });
});
