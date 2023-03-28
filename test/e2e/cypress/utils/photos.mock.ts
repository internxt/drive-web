const URL_PHOTOS = Cypress.env('REACT_APP_PHOTOS_API_URL');
const URL_BRIDGE = Cypress.env('REACT_APP_STORJ_BRIDGE');
const REACT_APP_PROXY = Cypress.env('REACT_APP_PROXY') ? Cypress.env('REACT_APP_PROXY') + '/' : '';

export enum MOCK {
  EMPTY = 'EMPTY',
  PHOTO1 = 'PHOTO1',
  PHOTO2 = 'PHOTO2',
  MULTIPLE = 'MULTIPLE',
}

export const photos_data = {
  BUCKET_ID: 'a528a6f703f27784eb101875',
  PHOTO1: {
    photoId: '637e3eecd77420b8a8e5cca5',
    photoName: 'IMG20221117114447.jpg',
    photoFileId: '637e3ee9f338d10007d10e5f',
    previewId: '637e3ee65cec070007e3efcf',
  },
  PHOTO2: {
    photoId: '637e3ef1d8426672d93a336e',
    photoName: 'IMG20221117114446.jpg',
    photoFileId: '637e3eb2e616ee0007f34d9c',
    previewId: '637e3eedf338d10007d10e64',
  },
};

export const mockPhotos = (typeMock: MOCK): void => {
  mockDefaultApis();
  switch (typeMock) {
    case MOCK.EMPTY:
      mockResultsEmpty();
      break;
    case MOCK.PHOTO1:
      mockResults1();
      mockPhoto1();
      break;
    case MOCK.MULTIPLE:
      mockResultsMultiple();
      mockMultiplePhotos();
      break;
  }
};

const GET_PHOTOS_PATH =
  '/photos/sorted?includeDownloadLinks=true&limit=60&skip=0&sortBy=takenAt&sortType=DESC&status=EXISTS';

const mockDefaultApis = () => {
  cy.intercept('GET', URL_PHOTOS + '/photos/usage', {
    statusCode: 200,
    body: '{"usage":6094182}',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
    },
  });
};

const mockResultsEmpty = () => {
  cy.intercept('GET', URL_PHOTOS + GET_PHOTOS_PATH, {
    statusCode: 500,
    body: '',
  });
};

const mockResults1 = () => {
  cy.intercept('GET', URL_PHOTOS + GET_PHOTOS_PATH, {
    //get 1 photo
    statusCode: 200,
    fixture: 'photos/common/mock-results-1.json',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
    },
  });
};

const mockResultsMultiple = () => {
  cy.intercept('GET', URL_PHOTOS + GET_PHOTOS_PATH, {
    //get all photos
    statusCode: 200,
    fixture: 'photos/common/mock-results-multiple.json',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
    },
  });
};

const mockPhoto1 = () => {
  //get photo preview info
  cy.intercept(
    'OPTIONS',
    URL_BRIDGE + '/buckets/' + photos_data.BUCKET_ID + '/files/' + photos_data.PHOTO1.previewId + '/info',
    {
      statusCode: 200,
    },
  );
  cy.intercept(
    'GET',
    URL_BRIDGE + '/buckets/' + photos_data.BUCKET_ID + '/files/' + photos_data.PHOTO1.previewId + '/info',
    {
      statusCode: 200,
      fixture: 'photos/common/mock-preview-info-1.json',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      },
    },
  );
  //get photo preview file
  cy.intercept('GET', REACT_APP_PROXY + 'https://storage.gra.cloud.ovh.net/mock/' + photos_data.PHOTO1.previewId, {
    statusCode: 200,
    fixture: 'photos/common/mock-preview-photo-1.blob',
  });

  //get photo info
  cy.intercept(
    'OPTIONS',
    URL_BRIDGE + '/buckets/' + photos_data.BUCKET_ID + '/files/' + photos_data.PHOTO1.photoFileId + '/info',
    {
      statusCode: 200,
    },
  );
  cy.intercept(
    'GET',
    URL_BRIDGE + '/buckets/' + photos_data.BUCKET_ID + '/files/' + photos_data.PHOTO1.photoFileId + '/info',
    {
      statusCode: 200,
      fixture: 'photos/common/mock-info-1.json',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      },
    },
  );
  //get photo file
  cy.intercept('GET', REACT_APP_PROXY + 'https://storage.gra.cloud.ovh.net/mock/' + photos_data.PHOTO1.photoFileId, {
    statusCode: 200,
    fixture: 'photos/common/mock-photo-1.blob',
  });
};

const mockPhoto2 = () => {
  //get photo preview info
  cy.intercept(
    'OPTIONS',
    URL_BRIDGE + '/buckets/' + photos_data.BUCKET_ID + '/files/' + photos_data.PHOTO2.previewId + '/info',
    {
      statusCode: 200,
    },
  );
  cy.intercept(
    'GET',
    URL_BRIDGE + '/buckets/' + photos_data.BUCKET_ID + '/files/' + photos_data.PHOTO2.previewId + '/info',
    {
      statusCode: 200,
      fixture: 'photos/common/mock-preview-info-2.json',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      },
    },
  );
  //get photo preview file
  cy.intercept('GET', REACT_APP_PROXY + 'https://storage.gra.cloud.ovh.net/mock/' + photos_data.PHOTO2.previewId, {
    statusCode: 200,
    fixture: 'photos/common/mock-preview-photo-2.blob',
  });

  //get photo info
  cy.intercept(
    'OPTIONS',
    URL_BRIDGE + '/buckets/' + photos_data.BUCKET_ID + '/files/' + photos_data.PHOTO2.photoFileId + '/info',
    {
      statusCode: 200,
    },
  );
  cy.intercept(
    'GET',
    URL_BRIDGE + '/buckets/' + photos_data.BUCKET_ID + '/files/' + photos_data.PHOTO2.photoFileId + '/info',
    {
      statusCode: 200,
      fixture: 'photos/common/mock-info-2.json',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      },
    },
  );
  //get photo file
  cy.intercept('GET', REACT_APP_PROXY + 'https://storage.gra.cloud.ovh.net/mock/' + photos_data.PHOTO2.photoFileId, {
    statusCode: 200,
    fixture: 'photos/common/mock-photo-2.blob',
  });
};

const mockMultiplePhotos = () => {
  mockPhoto1();
  mockPhoto2();
};
