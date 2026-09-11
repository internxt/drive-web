import { items as itemUtils } from '@internxt/lib';
import { DriveItemData } from 'app/drive/types';
import { IRoot } from 'app/store/slices/storage/types';

export type CollisionItem = File | IRoot | DriveItemData;

export type CollisionPair<T extends CollisionItem = CollisionItem> = { item: T; existing: DriveItemData };

export const isFolderUpload = (item: CollisionItem): item is IRoot => !!(item as IRoot).fullPathEdited;

const matchesName = (existing: DriveItemData, name: string) => (existing.plainName ?? existing.name) === name;

const matchesType = (existing: DriveItemData, type?: string | null) => (existing.type ?? null) === (type ?? null);

/**
 * Finds the drive item that collides with the given item. Uploaded folders match by name only,
 * uploaded files by name and extension, and moved items by kind, name and (for files) extension.
 */
export const findExistingItemFor = (item: CollisionItem, existingItems: DriveItemData[]): DriveItemData | undefined => {
  if (isFolderUpload(item)) {
    return existingItems.find((existing) => matchesName(existing, item.name));
  }

  if (item instanceof File) {
    const { filename, extension } = itemUtils.getFilenameAndExt(item.name);
    return existingItems.find((existing) => matchesName(existing, filename) && matchesType(existing, extension));
  }

  return existingItems.find(
    (existing) =>
      !!existing.isFolder === !!item.isFolder &&
      matchesName(existing, item.plainName ?? item.name) &&
      (item.isFolder || matchesType(existing, item.type)),
  );
};

/**
 * Pairs each item with the drive item it collides with, dropping items that have no match.
 */
export const getCollisionPairs = <T extends CollisionItem>(
  items: T[],
  existingItems: DriveItemData[],
): CollisionPair<T>[] =>
  items.flatMap((item) => {
    const existing = findExistingItemFor(item, existingItems);
    return existing ? [{ item, existing }] : [];
  });
