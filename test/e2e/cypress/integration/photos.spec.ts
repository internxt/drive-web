import { join } from 'path';
import { MOCK, mockPhotos, photos_data } from '../utils/photos.mock';

describe('Photos panel', () => {
  const downloadsFolder = String(Cypress.config('downloadsFolder'));

  beforeEach(() => {
    cy.clearLocalStorage();
    cy.login();
  });

  it('CY-01_Should list 0 photos', () => {
    mockPhotos(MOCK.EMPTY);
    cy.visit('/app/photos');

    cy.get('[data-test=photos-gallery]').should('be.visible');
    cy.get('[data-test=photos-gallery]').contains('Your gallery is empty');
    cy.get('[data-test=photos-grid]').should('not.exist');
  });

  it('CY-02_Should list 1 photo', () => {
    mockPhotos(MOCK.PHOTO1);
    cy.visit('/app/photos');

    cy.get('[data-test=photos-gallery]').should('be.visible');
    cy.get('[data-test=photos-grid]').should('be.visible');
    cy.get('[data-test=photos-grid]').find('img').should('have.length', 1);
  });

  it('CY-03_Should list 2 photos', () => {
    mockPhotos(MOCK.MULTIPLE);
    cy.visit('/app/photos');

    cy.get('[data-test=photos-gallery]').should('be.visible');
    cy.get('[data-test=photos-grid]').should('be.visible');
    cy.get('[data-test=photos-grid]').find('img').should('have.length', 2);
  });

  it('CY-04_Should do a fullscreen preview', () => {
    mockPhotos(MOCK.MULTIPLE);
    cy.visit('/app/photos');

    const photoId = photos_data.PHOTO1.photoId;
    cy.get('[data-test=photos-item-' + photoId + ']')
      .find('img')
      .click({ force: true });
    cy.get('[data-test=photos-preview]').find('img').should('be.visible');
  });

  it('CY-05_Should download 1 photo', () => {
    mockPhotos(MOCK.PHOTO1);
    cy.visit('/app/photos');

    const photo1 = photos_data.PHOTO1;
    cy.get('[data-test=photos-item-selector-' + photo1.photoId + ']').click({ force: true });

    cy.get('[data-test=photos-download-selected]').should('be.visible');
    cy.get('[data-test=photos-download-selected]')
      .click({ force: true })
      .then(() => {
        cy.readFile(join(downloadsFolder, photo1.photoName), 'binary', { timeout: 15000 });
        // TODO not only check if the photo had been downloaded (it should be compared with the desired photo)
        // i've tried to compare files but it runs out of memory
      });
  });

  it('CY-06_Should download multiple photos', () => {
    mockPhotos(MOCK.MULTIPLE);
    cy.visit('/app/photos');

    const photos = [photos_data.PHOTO1, photos_data.PHOTO2];
    const resultZipName = 'photos.zip';

    for (const photo of photos) {
      cy.get('[data-test=photos-item-selector-' + photo.photoId + ']').click({ force: true });
    }

    cy.get('[data-test=photos-download-selected]').should('be.visible');
    cy.get('[data-test=photos-download-selected]')
      .click({ force: true })
      .then(() => {
        cy.readFile(join(downloadsFolder, resultZipName), 'binary', { timeout: 15000 });
        // TODO not only check if the zip had been downloaded (it should be compared with the desired zip)
        // i've tried to compare files but it runs out of memory
      });
  });
});
