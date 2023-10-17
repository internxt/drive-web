describe('Backups view', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
    cy.login();
    cy.intercept('GET', '/api/backup/deviceAsFolder', { fixture: '/api/backups/deviceAsFolder.json' });
    cy.intercept('GET', '/api/storage/v2/folder/130', { fixture: '/api/backups/storagev2folder130.json' });
    cy.intercept('GET', '/api/storage/v2/folder/131', { fixture: '/api/backups/storagev2folder131.json' });
    cy.visit('/app/backups');
  });

  it('Should check if has backups devices', () => {
    cy.get('[data-test=device-list-item]').should('exist');
    cy.get('[data-test=device-list-item]').eq(0).should('exist');
  });

  it('Should check that exists items on the backup device', () => {
    cy.get('[data-test=device-list-item]').eq(0).dblclick();

    cy.get('[data-test=backup-list-folder]').eq(0).dblclick();

    cy.get('[data-test=backup-list-folder]').should('exist');
  });
});
