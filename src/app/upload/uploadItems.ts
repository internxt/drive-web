import { DriveItemData } from 'app/drive/types';
import { OwnerUserAuthenticationData } from 'app/network/types';
import DatabaseUploadRepository from 'app/repositories/DatabaseUploadRepository';
import { CollisionGroup } from 'app/store/slices/storage/storage.model';
import { IRoot } from 'app/store/slices/storage/types';
import { findNameCollisions } from './collisions';
import { Upload } from './Upload';
import {
  getAllowedFilesToUpload,
  getTotalSize,
  hasStorageAvailable,
  PlanStorage,
  UPLOAD_ITEMS_LIMIT,
} from './uploadChecks';

const REFRESH_DELAY_MS = 1000;

export interface UploadItemsPayload {
  destinationFolderUuid: string;
  roots: IRoot[];
  files: File[];
}

export type UploadItemsHandler = (payload: UploadItemsPayload) => Promise<void>;

export interface UploadContext {
  ownerUserAuthenticationData?: OwnerUserAuthenticationData;
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

export const uploadItems = async (
  { destinationFolderUuid, roots, files }: UploadItemsPayload,
  context: UploadContext,
): Promise<void> => {
  if (files.length > UPLOAD_ITEMS_LIMIT) {
    context.onUploadItemsLimitExceeded();
    return;
  }

  const allowed = getAllowedFilesToUpload(roots, files, context.maxUploadFileSize);

  if (allowed.exceededFiles.length > 0) {
    context.onFilesTooLarge(allowed.exceededFiles);
  }

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

  const hasNameCollisions = collisionGroups.length > 0;
  if (hasNameCollisions) {
    context.onNameCollisions(collisionGroups);
  }

  const hasEverythingCollided = rootsWithoutCollision.length === 0 && filesWithoutCollision.length === 0;
  if (hasEverythingCollided) return;

  await startUpload({ destinationFolderUuid, roots: rootsWithoutCollision, files: filesWithoutCollision }, context);
};

/**
 * Uploads items that already went through the upload checks, such as those whose name collision was resolved.
 */
export const startUpload = async (
  { destinationFolderUuid, roots, files }: UploadItemsPayload,
  context: UploadContext,
): Promise<void> => {
  const uploadRepository = DatabaseUploadRepository.getInstance();

  const upload = new Upload({
    destinationFolderUuid,
    roots,
    files,
    ownerUserAuthenticationData: context.ownerUserAuthenticationData,
    uploadRepository,
    onItemUploaded: (uploadedItem, parentFolderUuid, isFolder) => {
      const isFolderOutsideDestination = isFolder && parentFolderUuid !== destinationFolderUuid;
      if (isFolderOutsideDestination) return;

      context.onItemUploaded(uploadedItem as DriveItemData, parentFolderUuid);
    },
    onItemRemoved: (removedItem, parentFolderUuid) =>
      context.onItemRemoved(removedItem as DriveItemData, parentFolderUuid),
    onStorageFull: context.onPlanLimitReached,
  });

  await upload.run();

  setTimeout(() => context.onUploadFinished(destinationFolderUuid), REFRESH_DELAY_MS);
};
