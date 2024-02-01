import configService from '../core/services/config.service';
import { DatabaseCollection, DatabaseService } from '../database/services/database.service';
import indexedDBService from '../database/services/database.service/indexed-db.service';
import { TaskStatus } from '../tasks/types';

export interface PersistUploadRepository {
  setUploadState(id: string, status: TaskStatus): Promise<void>;
  getUploadState(id: string): Promise<TaskStatus | undefined>;
  removeUploadState(id: string): Promise<void>;
}

class DatabaseUploadRepository implements PersistUploadRepository {
  private static instance: DatabaseUploadRepository | null = null;
  private db: ReturnType<DatabaseService>;

  private constructor() {
    const appConfig = configService.getAppConfig();
    this.db = indexedDBService(appConfig.database.name, appConfig.database.version);
  }

  public static getInstance(): DatabaseUploadRepository {
    if (!DatabaseUploadRepository.instance) {
      DatabaseUploadRepository.instance = new DatabaseUploadRepository();
    }
    return DatabaseUploadRepository.instance;
  }

  async setUploadState(id: string, status: TaskStatus): Promise<void> {
    await this.db.put(DatabaseCollection.UploadItemStatus, id, status);
  }

  getUploadState(id: string): Promise<TaskStatus | undefined> {
    return this.db.get(DatabaseCollection.UploadItemStatus, id);
  }

  async removeUploadState(id: string): Promise<void> {
    await this.db.delete(DatabaseCollection.UploadItemStatus, id);
  }
}

export default DatabaseUploadRepository;
