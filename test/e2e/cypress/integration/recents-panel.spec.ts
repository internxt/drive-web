import { join } from 'path';

describe('Recents panel', () => {
  const filename = 'example.txt';
  const filenameRenamed = 'example2';
  const downloadsFolder = Cypress.config('downloadsFolder');
  const fixturesFolder = Cypress.config('fixturesFolder');
  const downloadedFileFullPath = join(downloadsFolder, filename);

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
    // If the link has been created the delete link is displayed
    cy.get('button.file-list-item-actions-button').click();
    cy.contains('Delete link');
  });

  it('Should delete shared link', () => {
    cy.get('button.file-list-item-actions-button').click();
    cy.get('a').contains('Get link').click();
    cy.get('button.file-list-item-actions-button').click();
    cy.get('a').contains('Delete link').click();
    cy.get('button.file-list-item-actions-button').click();
    cy.contains('Get link');
  });

  it('Should download a single file', () => {
    cy.get('[data-test=download-file-button]')
      .click({ force: true })
      .then(() => {
        cy.readFile(join(fixturesFolder as string, filename)).then((originalFile) => {
          cy.readFile(downloadedFileFullPath).should('eq', originalFile);
        });
      });
  });

  after(() => {
    cy.task('removeFile', downloadedFileFullPath);
  });

  it('Should rename file', () => {
    cy.get('button.file-list-item-actions-button').click();
    cy.get('a').contains('Rename').click();
    cy.get('input[name=fileName]').clear().type(filenameRenamed).type('{enter}');
    cy.contains(filenameRenamed);
  });
});
