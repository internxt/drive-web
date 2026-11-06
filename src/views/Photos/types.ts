import { Thumbnail } from '@internxt/sdk/dist/drive/storage/types';

export interface PhotoDevice {
  uuid: string;
  name: string;
}

export type MonthKey = `${number}-${string}`;

export type DayKey = `${MonthKey}-${string}`;

export interface PhotoMonth {
  key: MonthKey;
  deviceUuid: string;
  folderUuid: string;
}

export type PhotoThumbnail = Pick<Thumbnail, 'bucket_id' | 'bucket_file'>;

export interface Photo {
  id: number;
  uuid: string;
  folderId: number;
  name: string;
  type: string;
  month: MonthKey;
  day: DayKey;
  takenAt: string;
  updatedAt: string;
  thumbnail: PhotoThumbnail | null;
}
