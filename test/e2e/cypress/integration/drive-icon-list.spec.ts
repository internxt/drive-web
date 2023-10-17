import { mockGetPaginatedFiles, mockGetPaginatedFolders } from '../utils/drive.mock';

describe('Drive list icons', () => {
  beforeEach(() => {
    mockGetPaginatedFolders();
    mockGetPaginatedFiles();
    cy.clearLocalStorage();
    cy.login();
  });

  it('Should check if folder icons are displayed correctly', () => {
    cy.wait('@getPaginatedFolders', { timeout: 60000 }).then((foldersInterception) => {
      expect(foldersInterception.response.statusCode).to.equal(200);
      cy.get('[data-testid="light-folder"]').should('be.visible');
      cy.get('[data-test=file-list-folder-NewFolder-shared-icon]').should('be.visible');
    });
  });

  it('Should check if file icon types are displayed correctly', () => {
    cy.wait('@getPaginatedFiles', { timeout: 60000 }).then((filesInterception) => {
      expect(filesInterception.response.statusCode).to.equal(200);

      cy.get('[data-testid="image-svg"]').should('be.visible');
      cy.get('[data-testid="pdf-svg"]').should('be.visible');
      cy.get('[data-test=file-list-file-ExplorersGuide123-shared-icon]').should('be.visible');
      cy.get('[data-testid="zip-svg"]').should('be.visible');
      cy.get('[data-test=file-list-file-example-txt-shared-icon]').should('not.exist');
      cy.get('[data-testid="video-svg"]').should('be.visible');
      cy.get('[data-testid="audio-svg"]').should('be.visible');
    });
  });
});
