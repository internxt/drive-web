import { PhotoFolderFile } from '@internxt/sdk/dist/drive/photos';
import { FetchFolderFoldersCursorResponse } from '@internxt/sdk/dist/drive/storage/types';
import { SdkFactory } from 'app/core/factory/sdk';
import { DayKey, MonthKey, Photo, PhotoMonth, PhotoThumbnail } from '../types';

type Folder = FetchFolderFoldersCursorResponse['folders'][number];

const SUBFOLDERS_PAGE_SIZE = 50;
const PHOTOS_PAGE_SIZE = 200;
const PHOTOS_SEARCH_START = new Date(0).toISOString();

const toTwoDigits = (folderName: string) => folderName.padStart(2, '0');

const getLatestThumbnail = (thumbnails: PhotoFolderFile['thumbnails']): PhotoThumbnail | null => {
  if (!thumbnails?.length) return null;

  const latestThumbnail = thumbnails.reduce((latest, thumbnail) => (thumbnail.id > latest.id ? thumbnail : latest));
  return { bucket_id: latestThumbnail.bucketId, bucket_file: latestThumbnail.bucketFile };
};

export class PhotoFoldersService {
  public static readonly instance: PhotoFoldersService = new PhotoFoldersService();

  async getDeviceMonths(deviceUuid: string): Promise<PhotoMonth[]> {
    const yearFolders = await this.getSubfolders(deviceUuid);
    const monthsPerYear = await Promise.all(
      yearFolders.map((yearFolder) => this.getYearMonths(deviceUuid, yearFolder)),
    );

    return monthsPerYear.flat().sort((month, otherMonth) => otherMonth.key.localeCompare(month.key));
  }

  async getMonthPhotos(month: PhotoMonth): Promise<Photo[]> {
    const dayFolders = await this.getSubfolders(month.folderUuid);
    if (dayFolders.length === 0) return [];

    const dayOfFolder = new Map(
      dayFolders.map((dayFolder): [string, DayKey] => [
        dayFolder.uuid,
        `${month.key}-${toTwoDigits(dayFolder.plainName)}`,
      ]),
    );
    const files = await this.getFilesInFolders([...dayOfFolder.keys()]);

    return files
      .filter((file) => file.status === 'EXISTS')
      .map((file) => ({
        id: file.id,
        uuid: file.uuid,
        folderId: file.folderId,
        name: `${file.plainName}.${file.type}`,
        type: file.type,
        month: month.key,
        day: dayOfFolder.get(file.folderUuid) as DayKey,
        takenAt: file.creationTime,
        updatedAt: file.updatedAt,
        thumbnail: getLatestThumbnail(file.thumbnails),
      }));
  }

  private async getYearMonths(deviceUuid: string, yearFolder: Folder): Promise<PhotoMonth[]> {
    const monthFolders = await this.getSubfolders(yearFolder.uuid);

    return monthFolders.map((monthFolder) => ({
      key: `${yearFolder.plainName}-${toTwoDigits(monthFolder.plainName)}` as MonthKey,
      deviceUuid,
      folderUuid: monthFolder.uuid,
    }));
  }

  private async getSubfolders(folderUuid: string, cursor?: string): Promise<Folder[]> {
    const storageClient = SdkFactory.getNewApiInstance().createNewStorageClient();
    const [pageRequest] = storageClient.getFolderFoldersByUuidWithCursor(folderUuid, {
      limit: SUBFOLDERS_PAGE_SIZE,
      cursor,
    });
    const page = await pageRequest;

    if (!page.nextCursor) return page.folders;

    const nextFolders = await this.getSubfolders(folderUuid, page.nextCursor);
    return [...page.folders, ...nextFolders];
  }

  private async getFilesInFolders(folderUuids: string[], cursor?: string): Promise<PhotoFolderFile[]> {
    const photosClient = SdkFactory.getNewApiInstance().createPhotosClient();
    const from = cursor ? { cursor } : { updatedAt: PHOTOS_SEARCH_START };
    const page = await photosClient.getFilesInFolders({ folderUuids, limit: PHOTOS_PAGE_SIZE, ...from });

    if (!page.nextCursor) return page.files;

    const nextFiles = await this.getFilesInFolders(folderUuids, page.nextCursor);
    return [...page.files, ...nextFiles];
  }
}
