import { DatabaseCollection, DatabaseService } from 'app/database/services/database.service';
import configService from '../core/services/config.service';
import indexedDBService from '../database/services/database.service/indexed-db.service';
import { TaskStatus } from '../tasks/types';

export interface IDownloadRepository {
  setDownloadState(id: string, status: TaskStatus): Promise<void>;
  getDownloadState(id: string): Promise<TaskStatus | undefined>;
  removeDownloadState(id: string): Promise<void>;
  setDownloadPart(downloadId: string, part: number, content: ArrayBuffer): Promise<void>;
  getDownloadPart(downloadId: string, part: number): Promise<ArrayBuffer>;
  removeDownloadPart(download: string, part: number): Promise<void>;
}

class IndexedDbDownloadRepository implements IDownloadRepository {
  private static instance: IndexedDbDownloadRepository | null = null;
  private db: ReturnType<DatabaseService>;

  private constructor() {
    const appConfig = configService.getAppConfig();
    this.db = indexedDBService(appConfig.database.name, appConfig.database.version);
  }

  public static getInstance(): IndexedDbDownloadRepository {
    if (!IndexedDbDownloadRepository.instance) {
      IndexedDbDownloadRepository.instance = new IndexedDbDownloadRepository();
    }
    return IndexedDbDownloadRepository.instance;
  }

  async setDownloadState(id: string, status: TaskStatus): Promise<void> {
    await this.db.put(DatabaseCollection.DownloadItemStatus, id, status);
  }

  getDownloadState(id: string): Promise<TaskStatus | undefined> {
    return this.db.get(DatabaseCollection.DownloadItemStatus, id);
  }

  async removeDownloadState(id: string): Promise<void> {
    await this.db.delete(DatabaseCollection.DownloadItemStatus, id);
  }

  async setDownloadPart(downloadId: string, part: number, content: ArrayBuffer): Promise<void> {
    await this.db.put(DatabaseCollection.DownloadFileParts, `${downloadId}-${part}`, content);
  }

  async getDownloadPart(downloadId: string, part: number): Promise<ArrayBuffer> {
    return this.db.get(DatabaseCollection.DownloadFileParts, `${downloadId}-${part}`) as unknown as ArrayBuffer;
  }

  async removeDownloadPart(downloadId: string, part: number): Promise<void> {
    await this.db.delete(DatabaseCollection.DownloadFileParts, `${downloadId}-${part}`);
  }
}

export default IndexedDbDownloadRepository;
