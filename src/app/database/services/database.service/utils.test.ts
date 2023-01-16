import { deleteDatabasePhotos, deleteDatabaseItemsFromFolder, deleteDatabaseItemsFromDifferentFolders } from './utils';

import databaseService, { AppDatabase, DatabaseCollection, DriveItemBlobData } from '.';
import { DriveFileData, DriveItemData } from '../../../drive/types';
import { folderBlobItems, folderThreeBlobItems, folderTwoBlobItems, levels_blobs, photos } from './mocks';

describe('databaseService utils', () => {
  const get = (database) => (databaseKey: DatabaseCollection, itemKey: number | string) =>
    Promise.resolve<DriveItemBlobData[]>(database[databaseKey][itemKey]);

  const put =
    (database) =>
    (
      collectionName: DatabaseCollection,
      key: AppDatabase[DatabaseCollection]['key'],
      value: AppDatabase[DatabaseCollection]['value'],
    ) => {
      database[collectionName][key] = value;
      return Promise.resolve();
    };

  const delte = (database) => (collectionName: DatabaseCollection, key: AppDatabase[DatabaseCollection]['key']) => {
    delete database[collectionName][key];
    return Promise.resolve();
  };

  it('should correctly delete the photos from database.', async () => {
    const photosId = ['id1', 'id34'];
    const database = {
      [DatabaseCollection.Levels]: { ...levels_blobs },
      [DatabaseCollection.LevelsBlobs]: { ...levels_blobs },
      [DatabaseCollection.Photos]: { ...photos },
    };
    jest.spyOn(databaseService, 'get').mockImplementation(get(database));
    jest.spyOn(databaseService, 'put').mockImplementation(put(database));
    jest.spyOn(databaseService, 'delete').mockImplementation(delte(database));

    await deleteDatabasePhotos(photosId);

    expect(databaseService.delete).toHaveBeenCalledWith(DatabaseCollection.Photos, 'id1');
    expect(databaseService.delete).toHaveBeenCalledWith(DatabaseCollection.Photos, 'id34');
    expect(database.photos).toEqual({ id2: { preview: {} } });
  });

  it('should correctly delete files from specific folder from database.', async () => {
    const database = {
      [DatabaseCollection.Levels]: { ...levels_blobs },
      [DatabaseCollection.LevelsBlobs]: { ...levels_blobs },
      [DatabaseCollection.Photos]: { ...photos },
    };
    jest.spyOn(databaseService, 'get').mockImplementation(get(database));
    jest.spyOn(databaseService, 'put').mockImplementation(put(database));
    jest.spyOn(databaseService, 'delete').mockImplementation(delte(database));
    const levelsBlobsResult = {
      1: [{ id: 13 }, { id: 14 }],
      2: folderTwoBlobItems,
      34: folderThreeBlobItems,
    };
    const driveIdsToDelete = [{ id: 11 }, { id: 15 }] as DriveFileData[];

    await deleteDatabaseItemsFromFolder(1, driveIdsToDelete);

    expect(database.levels_blobs).toEqual(levelsBlobsResult);
  });

  it('should correctly delete files and folders from database.', async () => {
    const database = {
      [DatabaseCollection.Levels]: { ...levels_blobs },
      [DatabaseCollection.LevelsBlobs]: { ...levels_blobs },
      [DatabaseCollection.Photos]: { ...photos },
    };
    jest.spyOn(databaseService, 'get').mockImplementation(get(database));
    jest.spyOn(databaseService, 'put').mockImplementation(put(database));
    jest.spyOn(databaseService, 'delete').mockImplementation(delte(database));
    const driveItemsToDelete = [{ id: 11 }, { id: 2, isFolder: true }, { id: 34, isFolder: true }] as DriveFileData[];

    await deleteDatabaseItemsFromFolder(1, driveItemsToDelete);

    const levelsBlobsResult = {
      1: [{ id: 15 }, { id: 13 }, { id: 14 }],
      2: [],
      34: [],
    };
    expect(database.levels_blobs).toEqual(levelsBlobsResult);
  });

  it('should correctly delete files from different folders', async () => {
    const database = {
      [DatabaseCollection.Levels]: { ...levels_blobs },
      [DatabaseCollection.LevelsBlobs]: { ...levels_blobs },
      [DatabaseCollection.Photos]: { ...photos },
    };
    jest.spyOn(databaseService, 'get').mockImplementation(get(database));
    jest.spyOn(databaseService, 'put').mockImplementation(put(database));
    jest.spyOn(databaseService, 'delete').mockImplementation(delte(database));

    const driveItemsToDelete = [
      { id: 21, folderId: 2 },
      { id: 341, folderId: 34 },
    ] as DriveItemData[];

    await deleteDatabaseItemsFromDifferentFolders(driveItemsToDelete);

    const levelsBlobsResult = {
      '1': folderBlobItems,
      '2': [],
      '34': [{ id: 342 }, { id: 343 }],
    };
    expect(database.levels_blobs).toEqual(levelsBlobsResult);
  });
});
