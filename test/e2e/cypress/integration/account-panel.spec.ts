describe('Account panel', () => {
  const firstName = 'Name';
  const lastName = 'Lastname';
  const email = 'name@intx.com';

    beforeEach(() => {
      cy.clearLocalStorage();
      cy.login();
      cy.visit('/preferences?tab=account');
    });

    it('Should edit name and lastname', () => {
      cy.get('button').contains('Edit').click();
      cy.get('input[name=firstName]').type(firstName);
      cy.get('input[name=lastName]').type(lastName);
      cy.get('button').contains('Save').click();
      cy.contains(firstName);
      cy.contains(lastName);
    });

    it('Should invite friend', () => {
      cy.get('input:first').should('have.attr', 'placeholder', 'Enter friend email').type(email);
      cy.get('button').contains('Send invitation').click();
      cy.get('button').contains('See all invitations').click();
      cy.contains(email);
    });

});