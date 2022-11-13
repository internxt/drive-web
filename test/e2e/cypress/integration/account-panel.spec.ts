describe('Account panel', () => {
  const firstName = 'Name';
  const lastName = 'Lastname';

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

});