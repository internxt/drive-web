import databaseService, { AppDatabase, DatabaseCollection } from '../../database/services/database.service';
import { DriveItemData } from '../types';
import { levels_blobs } from '../../database/services/database.service/mocks';

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

  it('just mocks the test', () => {

  });
});
