import { DriveItemData } from 'app/drive/types';
import { OwnerUserAuthenticationData } from 'app/network/types';
import { PersistUploadRepository } from 'app/repositories/DatabaseUploadRepository';
import { filterFilesByMaxSize } from 'app/store/slices/storage/fileUtils/filterFilesByMaxSize';
import { CollisionGroup } from 'app/store/slices/storage/storage.model';
import {
  handleRepeatedUploadingFiles,
  handleRepeatedUploadingFolders,
} from 'app/store/slices/storage/storage.thunks/renameItemsThunk';
import { IRoot } from 'app/store/slices/storage/types';
import { Upload } from './Upload';

export const UPLOAD_ITEMS_LIMIT = 3000;
const REFRESH_DELAY_MS = 1000;

export interface UploadItemsPayload {
  destinationFolderUuid: string;
  roots: IRoot[];
  files: File[];
}

interface PlanStorage {
  limit: number;
  usage: number;
}

export interface UploadContext {
  ownerUserAuthenticationData?: OwnerUserAuthenticationData;
  uploadRepository: PersistUploadRepository;
  maxUploadFileSize: number;
  planStorage: PlanStorage;
  onUploadItemsLimitExceeded: () => void;
  onFilesTooLarge: (exceededFiles: File[]) => void;
  onPlanLimitReached: () => void;
  onNameCollisions: (collisionGroups: CollisionGroup[]) => void;
  onItemUploaded: (uploadedItem: DriveItemData, parentFolderUuid: string) => void;
  onItemRemoved: (removedItem: DriveItemData, parentFolderUuid: string) => void;
  onUploadFinished: (destinationFolderUuid: string) => void;
}

interface RepeatedItemsCheck<T> {
  repeatedItems: T[];
  existingItems: DriveItemData[];
  unrepeatedItems: T[];
}

const isHiddenFile = (file: File) => file.name.startsWith('.');

const getFilesIn = (folder: IRoot): File[] => [...folder.childrenFiles, ...folder.childrenFolders.flatMap(getFilesIn)];

/**
 * A folder without subfolders whose files are all too large makes its whole uploaded folder fail, as it did before.
 */
const hasFolderWithOnlyTooLargeFiles = (folder: IRoot, maxUploadFileSize: number): boolean => {
  const hasNoSubfolders = folder.childrenFolders.length === 0;
  const hasOnlyTooLargeFiles =
    folder.childrenFiles.length > 0 && folder.childrenFiles.every((file) => file.size > maxUploadFileSize);
  if (hasNoSubfolders) return hasOnlyTooLargeFiles;

  return folder.childrenFolders.some((subfolder) => hasFolderWithOnlyTooLargeFiles(subfolder, maxUploadFileSize));
};

/**
 * Drops the files that are too large to upload, the uploaded folders that can't be uploaded because of them and,
 * inside folders, the hidden files.
 */
const getAllowedItems = (roots: IRoot[], files: File[], maxUploadFileSize: number) => {
  const exceededFiles: File[] = [];
  const rejectedRoots = roots.filter((root) => hasFolderWithOnlyTooLargeFiles(root, maxUploadFileSize));
  for (const root of rejectedRoots) {
    exceededFiles.push(...getFilesIn(root).filter((file) => file.size > maxUploadFileSize));
  }
  const uploadableRoots = roots.filter((root) => !rejectedRoots.includes(root));

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

  return { roots: uploadableRoots.map(keepAllowedContent), files: keepAllowedFiles(files), exceededFiles };
};

const getTotalSize = (roots: IRoot[], files: File[]): number => {
  const sizeOfFiles = (candidates: File[]) => candidates.reduce((total, file) => total + file.size, 0);
  const sizeOfFolder = (folder: IRoot): number =>
    folder.childrenFolders.reduce((total, child) => total + sizeOfFolder(child), sizeOfFiles(folder.childrenFiles));

  return roots.reduce((total, root) => total + sizeOfFolder(root), sizeOfFiles(files));
};

const hasStorageAvailable = ({ limit, usage }: PlanStorage, uploadSize: number): boolean => {
  const hasUnlimitedStorage = !limit;
  return hasUnlimitedStorage || usage + uploadSize < limit;
};

const noRepeatedItems = <T>(): RepeatedItemsCheck<T> => ({ repeatedItems: [], existingItems: [], unrepeatedItems: [] });

const findNameCollisions = async (destinationFolderUuid: string, roots: IRoot[], files: File[]) => {
  const [filesCheck, foldersCheck] = await Promise.all([
    files.length > 0 ? handleRepeatedUploadingFiles(files, destinationFolderUuid) : noRepeatedItems<File>(),
    roots.length > 0 ? handleRepeatedUploadingFolders(roots, destinationFolderUuid) : noRepeatedItems<IRoot>(),
  ]);

  const collisionGroups = [filesCheck, foldersCheck]
    .filter((check) => check.repeatedItems.length > 0)
    .map(
      (check) =>
        ({
          destinationUuid: destinationFolderUuid,
          duplicatedItems: check.repeatedItems,
          existingItems: check.existingItems,
          unrepeatedItems: check.unrepeatedItems,
        }) as CollisionGroup,
    );

  return {
    collisionGroups,
    rootsWithoutCollision: foldersCheck.unrepeatedItems as IRoot[],
    filesWithoutCollision: filesCheck.unrepeatedItems as File[],
  };
};

/**
 * Every place the user uploads from goes through here: the same checks in the same order, then the upload.
 * Items whose name already exists in the destination go to the name collision dialog; the rest are uploaded.
 */
export const uploadItems = async (
  { destinationFolderUuid, roots, files }: UploadItemsPayload,
  context: UploadContext,
): Promise<void> => {
  if (files.length > UPLOAD_ITEMS_LIMIT) {
    context.onUploadItemsLimitExceeded();
    return;
  }

  const allowed = getAllowedItems(roots, files, context.maxUploadFileSize);
  if (allowed.exceededFiles.length > 0) context.onFilesTooLarge(allowed.exceededFiles);

  const hasNothingAllowedToUpload = allowed.roots.length === 0 && allowed.files.length === 0;
  if (hasNothingAllowedToUpload) return;

  if (!hasStorageAvailable(context.planStorage, getTotalSize(allowed.roots, allowed.files))) {
    context.onPlanLimitReached();
    return;
  }

  const { collisionGroups, rootsWithoutCollision, filesWithoutCollision } = await findNameCollisions(
    destinationFolderUuid,
    allowed.roots,
    allowed.files,
  );
  if (collisionGroups.length > 0) context.onNameCollisions(collisionGroups);

  const hasEverythingCollided = rootsWithoutCollision.length === 0 && filesWithoutCollision.length === 0;
  if (hasEverythingCollided) return;

  await startUpload({ destinationFolderUuid, roots: rootsWithoutCollision, files: filesWithoutCollision }, context);
};

/**
 * Uploads items that already went through the checks, such as those whose name collision the user resolved.
 */
const startUpload = async (
  { destinationFolderUuid, roots, files }: UploadItemsPayload,
  context: UploadContext,
): Promise<void> => {
  const upload = new Upload({
    destinationFolderUuid,
    roots,
    files,
    ownerUserAuthenticationData: context.ownerUserAuthenticationData,
    uploadRepository: context.uploadRepository,
    onItemUploaded: (uploadedItem, parentFolderUuid, isFolder) => {
      const isSubfolder = isFolder && parentFolderUuid !== destinationFolderUuid;
      if (isSubfolder) return;

      context.onItemUploaded(uploadedItem as DriveItemData, parentFolderUuid);
    },
    onItemRemoved: (removedItem, parentFolderUuid) =>
      context.onItemRemoved(removedItem as DriveItemData, parentFolderUuid),
    onStorageFull: context.onPlanLimitReached,
  });

  await upload.run();

  setTimeout(() => context.onUploadFinished(destinationFolderUuid), REFRESH_DELAY_MS);
};
