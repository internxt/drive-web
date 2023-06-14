describe('Upload file', () => {
  const filename = 'example.txt';

  beforeEach(() => {
    cy.clearLocalStorage();
    cy.login();
  });

  it('Should upload a single file', () => {
    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(10000);

    cy.get('input[type=file]').attachFile(filename);
    cy.get('[data-test=file-name]').should('have.text', filename);
  });
});
