describe('Recents panel', () => {
    beforeEach(() => {
      cy.clearLocalStorage();
      cy.login();
      cy.visit('/app/recents');
    });

    it('Should list recents', () => {
      cy.contains('example.txt');
    });

    it('Should get link', () => {
      cy.get('button.file-list-item-actions-button').click();
      cy.get('a').contains('Get link').click();
      cy.get('button.file-list-item-actions-button').click();
      cy.contains('Delete link');
    });

});