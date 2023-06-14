import { DriveItemData } from '../../../../src/app/drive/types/index';
import { EXAMPLE_FILENAME, PAGINATION_ENDPOINT_REGEX } from '../constans';

describe('Drive pagination', () => {
  beforeEach(() => {
    cy.intercept('GET', PAGINATION_ENDPOINT_REGEX.FOLDERS, (req) => {
      delete req.headers['if-none-match'];
    }).as('getFolders');
    cy.intercept('GET', PAGINATION_ENDPOINT_REGEX.FILES, (req) => {
      delete req.headers['if-none-match'];
    }).as('getFiles');
    cy.clearLocalStorage();
    cy.login();
  });

  it('Should check if paginated folders arrives correctly', () => {
    cy.wait('@getFolders', { timeout: 60000 }).then((foldersInterception) => {
      expect(foldersInterception.response.statusCode).to.equal(200);
      const foldersResponseItems = foldersInterception.response.body.result;
      expect(foldersResponseItems).to.have.lengthOf(2);
    });
  });

  it('Should check if paginated files arrives correctly', () => {
    cy.wait('@getFiles', { timeout: 60000 }).then((filesInterception) => {
      expect(filesInterception.response.statusCode).to.equal(200);
      const filesResponseItems = filesInterception.response.body.result;
      expect(filesResponseItems).to.have.lengthOf(1);
      const file: DriveItemData = filesResponseItems[0];
      expect(file.plainName + '.' + file.type).to.equal(EXAMPLE_FILENAME);
    });
  });
});
