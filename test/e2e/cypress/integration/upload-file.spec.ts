describe('Upload file', () => {
  const filename = 'example.txt';

  beforeEach(() => {
    cy.clearLocalStorage();
    cy.login();
  });

  it('Should upload a single file', () => {
    cy.get('input[type=file]').attachFile(filename);

    cy.get('[data-test=file-name]').should('have.text', filename);
  });
});
