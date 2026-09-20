import { DriveItemData } from 'app/drive/types';
import { IRoot } from 'app/store/slices/storage/types';

export type CollisionItem = File | IRoot | DriveItemData;

export type CollisionPair<T extends CollisionItem = CollisionItem> = { item: T; existing: DriveItemData };

export const isFolderUpload = (item: CollisionItem): item is IRoot => !!(item as IRoot).fullPathEdited;
