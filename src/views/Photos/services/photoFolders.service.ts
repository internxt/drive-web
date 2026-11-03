import { FetchFolderFoldersCursorResponse } from '@internxt/sdk/dist/drive/storage/types';
import { SdkFactory } from 'app/core/factory/sdk';
import { MonthKey, PhotoMonth } from '../types';

type Folder = FetchFolderFoldersCursorResponse['folders'][number];

const SUBFOLDERS_PAGE_SIZE = 50;
const YEAR_FOLDER_NAME = /^\d{4}$/;
const MONTH_FOLDER_NAME = /^(0?[1-9]|1[0-2])$/;

export class PhotoFoldersService {
  public static readonly instance: PhotoFoldersService = new PhotoFoldersService();

  async getDeviceMonths(deviceUuid: string): Promise<PhotoMonth[]> {
    const yearFolders = await this.getSubfolders(deviceUuid, YEAR_FOLDER_NAME);
    const monthsPerYear = await Promise.all(
      yearFolders.map((yearFolder) => this.getYearMonths(deviceUuid, yearFolder)),
    );

    return monthsPerYear.flat().sort((month, otherMonth) => otherMonth.key.localeCompare(month.key));
  }

  private async getYearMonths(deviceUuid: string, yearFolder: Folder): Promise<PhotoMonth[]> {
    const monthFolders = await this.getSubfolders(yearFolder.uuid, MONTH_FOLDER_NAME);

    return monthFolders.map((monthFolder) => ({
      key: `${yearFolder.plainName}-${monthFolder.plainName.padStart(2, '0')}` as MonthKey,
      deviceUuid,
      folderUuid: monthFolder.uuid,
    }));
  }

  private async getSubfolders(folderUuid: string, namePattern: RegExp): Promise<Folder[]> {
    const storageClient = SdkFactory.getNewApiInstance().createNewStorageClient();
    const subfolders: Folder[] = [];
    let cursor: string | undefined;

    do {
      const [pageRequest] = storageClient.getFolderFoldersByUuidWithCursor(folderUuid, {
        limit: SUBFOLDERS_PAGE_SIZE,
        cursor,
      });
      const page = await pageRequest;
      subfolders.push(...page.folders);
      cursor = page.nextCursor ?? undefined;
    } while (cursor);

    return subfolders.filter((subfolder) => namePattern.test(subfolder.plainName));
  }
}
