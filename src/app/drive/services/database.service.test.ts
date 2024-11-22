import { AppDatabase, DatabaseCollection } from '../../database/services/database.service';
import { DriveItemData } from '../types';

describe('databaseService', () => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const get = (database) => (databaseKey: DatabaseCollection, itemKey: number | string) =>
    Promise.resolve<DriveItemData[]>(database[databaseKey][itemKey]);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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

  it('just mocks the test', () => {});
});
