describe('Unauthorized user', () => {
  const WAIT_MILLISECONDS = 10000;

  beforeEach(() => {
    Cypress.on('uncaught:exception', () => {
      // returning false here prevents Cypress from
      // failing the test on a request exception
      // We most likely want to set this globally
      return false;
    });
    cy.clearLocalStorage();
    cy.login();
  });

  it('Should be sent to login', () => {
    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(WAIT_MILLISECONDS);
    cy.clearLocalStorage();
    // To not show the after signup onboarding
    cy.window().then((win) => {
      win.localStorage.setItem('signUpTutorialCompleted', 'true');
    });
    cy.get(':nth-child(1) > .flex-grow-1 > [data-test="file-list-folder"] > .absolute')
      .dblclick({ force: true })
      .then(() => {
        cy.url().should('include', '/login');
      });
  });
});
