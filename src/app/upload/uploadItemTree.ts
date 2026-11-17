import { items as itemUtils } from '@internxt/lib';
import { IRoot } from 'app/store/slices/storage/types';
import { UploadFileItem, UploadFolderItem, UploadItem, UploadItemKind } from './types';

export const createFileItem = (file: File, parentFolderUuid: string, parent?: UploadFolderItem): UploadFileItem => {
  const { filename, extension } = itemUtils.getFilenameAndExt(file.name);

  return {
    kind: UploadItemKind.File,
    file: { name: filename, type: extension, size: file.size, content: file, parentFolderId: parentFolderUuid },
    parent,
  };
};

export const createFolderItem = (
  folder: IRoot,
  parentFolderUuid: string,
  parent?: UploadFolderItem,
): UploadFolderItem => ({
  kind: UploadItemKind.Folder,
  folder,
  parentFolderUuid,
  parent,
});

export const isFolderItem = (item: UploadItem): item is UploadFolderItem => item.kind === UploadItemKind.Folder;

export const getItemAndItsFolders = (item: UploadItem): UploadItem[] => {
  const itemAndItsFolders: UploadItem[] = [];
  for (let current: UploadItem | undefined = item; current; current = current.parent) {
    itemAndItsFolders.push(current);
  }
  return itemAndItsFolders;
};

export const getTopLevelItem = (item: UploadItem): UploadItem => getItemAndItsFolders(item).at(-1) as UploadItem;

export const isPartOf = (item: UploadItem, otherItem: UploadItem): boolean =>
  getItemAndItsFolders(item).includes(otherItem);

export const getParentFolderUuid = (item: UploadItem): string =>
  isFolderItem(item) ? item.parentFolderUuid : item.file.parentFolderId;

export const countItemsIn = (folder: IRoot): number =>
  folder.childrenFolders.reduce((count, child) => count + countItemsIn(child), 1 + folder.childrenFiles.length);
