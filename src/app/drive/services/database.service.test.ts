import { describe, it } from 'vitest';
import { AppDatabase, DatabaseCollection } from '../../database/services/database.service';
import { DriveItemData } from '../types';

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

  it('just mocks the test', () => {});
});
