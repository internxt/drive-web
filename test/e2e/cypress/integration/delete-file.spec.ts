describe('Delete file', () => {
  beforeEach(() => {
    cy.login();
  });

  it('Should delete a single file', () => {
    const deleteFileButtonSelector = '[data-test=file-list-file] [data-test=delete-file-button]';

    cy.get(deleteFileButtonSelector).click({ force: true });
    cy.get('button.primary:contains(Delete)').click();

    cy.get(deleteFileButtonSelector).should('not.exist');
  });
});
