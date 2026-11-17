import { Thumbnail } from '@internxt/sdk/dist/drive/storage/types';
import { DriveItemData } from 'app/drive/types';

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

export type PhotoKind = 'photo' | 'video' | 'livePhoto' | 'burst';

export interface Photo {
  id: number;
  uuid: string;
  folderId: number;
  name: string;
  type: string;
  day: DayKey;
  takenAt: string;
  updatedAt: string;
  thumbnail: PhotoThumbnail | null;
  kind: PhotoKind;
  relatedFiles: Photo[];
  file: DriveItemData;
}
