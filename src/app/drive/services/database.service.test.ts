import databaseService, { AppDatabase, DatabaseCollection } from '../../database/services/database.service';
import { DriveItemData } from '../types';
import { levels_blobs, photos } from '../../database/services/database.service/mocks';
import { deleteDatabasePhotos } from './database.service';

describe('databaseService', () => {
  const get = (database) => (databaseKey: DatabaseCollection, itemKey: number | string) =>
    Promise.resolve<DriveItemData[]>(database[databaseKey][itemKey]);

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
    expect(database.photos).toEqual({ id2: { source: {} } });
  });
});
