import { filterFilesByMaxSize } from 'app/store/slices/storage/fileUtils/filterFilesByMaxSize';
import { IRoot } from 'app/store/slices/storage/types';

export const UPLOAD_ITEMS_LIMIT = 3000;

export interface PlanStorage {
  limit: number;
  usage: number;
}

export const isHiddenFile = (file: File) => file.name.startsWith('.');

/**
 * Drops the files that are too large to upload and, inside folders, the hidden files.
 */
export const getAllowedFilesToUpload = (roots: IRoot[], files: File[], maxUploadFileSize: number) => {
  const exceededFiles: File[] = [];

  const keepAllowedFiles = (candidates: File[]) => {
    const { allowedFilesToUpload, exceededFiles: exceeded } = filterFilesByMaxSize({
      files: candidates,
      maxUploadFileSize,
    });
    exceededFiles.push(...exceeded);
    return allowedFilesToUpload;
  };

  const keepAllowedContent = (folder: IRoot): IRoot => ({
    ...folder,
    childrenFiles: keepAllowedFiles(folder.childrenFiles.filter((file) => !isHiddenFile(file))),
    childrenFolders: folder.childrenFolders.map(keepAllowedContent),
  });

  return { roots: roots.map(keepAllowedContent), files: keepAllowedFiles(files), exceededFiles };
};

export const getTotalSize = (roots: IRoot[], files: File[]): number => {
  const sizeOfFiles = (candidates: File[]) => candidates.reduce((total, file) => total + file.size, 0);
  const sizeOfFolder = (folder: IRoot): number =>
    folder.childrenFolders.reduce((total, child) => total + sizeOfFolder(child), sizeOfFiles(folder.childrenFiles));

  return roots.reduce((total, root) => total + sizeOfFolder(root), sizeOfFiles(files));
};

export const hasStorageAvailable = ({ limit, usage }: PlanStorage, uploadSize: number): boolean => {
  const hasUnlimitedStorage = !limit;
  return hasUnlimitedStorage || usage + uploadSize < limit;
};
