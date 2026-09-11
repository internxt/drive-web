import { WorkspaceData } from '@internxt/sdk/dist/workspaces';
import { uploadFoldersWithTracking } from 'app/drive/services/folder.service/uploadFoldersWithTracking';
import { Network, getEnvironmentConfig } from 'app/drive/services/network.service';
import { DriveItemData } from 'app/drive/types';
import { AppDispatch } from 'app/store';
import { fileVersionsActions } from 'app/store/slices/fileVersions';
import { storageActions } from 'app/store/slices/storage';
import { checkDuplicatedFiles } from 'app/store/slices/storage/fileUtils/checkDuplicatedFiles';
import { getUniqueFilename } from 'app/store/slices/storage/fileUtils/getUniqueFilename';
import { checkFolderDuplicated } from 'app/store/slices/storage/folderUtils/checkFolderDuplicated';
import { getUniqueFolderName } from 'app/store/slices/storage/folderUtils/getUniqueFolderName';
import storageThunks from 'app/store/slices/storage/storage.thunks';
import { fetchSortedFolderContentThunk } from 'app/store/slices/storage/storage.thunks/fetchSortedFolderContentThunk';
import { MoveItemPayload } from 'app/store/slices/storage/storage.thunks/moveItemsThunk';
import { IRoot } from 'app/store/slices/storage/types';
import { isVersioningExtensionAllowed } from 'views/Drive/components/VersionHistory/utils';
import replaceFileService from 'views/Drive/services/replaceFile.service';
import { moveItemsToTrash } from 'views/Trash/services';
import { CollisionItem, CollisionPair, isFolderUpload } from './nameCollision.utils';

export type CollisionOperationType = 'move' | 'upload';
export type CollisionOperation = 'keep' | 'replace';

export interface NameCollisionContext {
  dispatch: AppDispatch;
  selectedWorkspace: WorkspaceData | null;
  maxUploadFileSize: number;
  isVersioningEnabled: boolean;
}

export interface ResolveCollisionParams {
  operationType: CollisionOperationType;
  operation: CollisionOperation;
  items: CollisionItem[];
  existingItems: DriveItemData[];
  destinationUuid: string;
}

type ResolveMoveCollisionParams = Omit<ResolveCollisionParams, 'operationType' | 'items'> & { items: DriveItemData[] };
type ResolveUploadCollisionParams = Omit<ResolveCollisionParams, 'operationType' | 'items'> & {
  items: (IRoot | File)[];
};

const getUniqueNameMovePayload = async (item: DriveItemData, destinationUuid: string): Promise<MoveItemPayload> => {
  if (item.isFolder) {
    const { duplicatedFoldersResponse } = await checkFolderDuplicated([item], destinationUuid);
    const finalName = await getUniqueFolderName(
      item.plainName ?? item.name,
      duplicatedFoldersResponse as DriveItemData[],
      destinationUuid,
    );
    return { ...item, name: finalName, plain_name: finalName, newItemName: finalName };
  }

  const { duplicatedFilesResponse } = await checkDuplicatedFiles([item], destinationUuid);
  const finalName = await getUniqueFilename(item.name, item.type, duplicatedFilesResponse, destinationUuid);
  return { ...item, name: finalName, plainName: finalName, plain_name: finalName, newItemName: finalName };
};

/**
 * Moves each item to the destination under a name that does not collide with anything there.
 */
const keepAndMoveItems = async (
  items: DriveItemData[],
  destinationUuid: string,
  { dispatch }: NameCollisionContext,
) => {
  for (const item of items) {
    const itemParsed = await getUniqueNameMovePayload(item, destinationUuid);
    await dispatch(storageThunks.moveItemsThunk({ items: [itemParsed], destinationFolderId: destinationUuid }));
  }
};

/**
 * Trashes the colliding drive items and then moves the incoming ones into their place.
 */
const replaceAndMoveItems = async (
  items: DriveItemData[],
  existingItems: DriveItemData[],
  destinationUuid: string,
  { dispatch }: NameCollisionContext,
) => {
  await moveItemsToTrash(existingItems);
  await dispatch(storageThunks.moveItemsThunk({ items, destinationFolderId: destinationUuid }));
};

/**
 * Applies the chosen resolution to items that collide while being moved, then removes them
 * from the pending-deletion list.
 */
const resolveMoveCollision = async (
  { operation, items, existingItems, destinationUuid }: ResolveMoveCollisionParams,
  context: NameCollisionContext,
) => {
  if (operation === 'keep') {
    await keepAndMoveItems(items, destinationUuid, context);
  } else {
    await replaceAndMoveItems(items, existingItems, destinationUuid, context);
  }
  context.dispatch(storageActions.popItemsToDelete(items));
};

const uploadFileAndGetFileId = async (
  file: File,
  itemToReplace: DriveItemData,
  { selectedWorkspace }: NameCollisionContext,
): Promise<string> => {
  const { bridgeUser, bridgePass, encryptionKey, bucketId } = await getEnvironmentConfig(!!selectedWorkspace);
  const network = new Network(bridgeUser, bridgePass, encryptionKey);
  const taskId = `replace-${itemToReplace.uuid}-${Date.now()}`;
  const [uploadPromise] = network.uploadFile(
    bucketId,
    { filecontent: file, filesize: file.size, progressCallback: () => {} },
    { taskId },
  );
  return uploadPromise;
};

const replaceFileVersion = async (file: File, itemToReplace: DriveItemData, context: NameCollisionContext) => {
  const newFileId = await uploadFileAndGetFileId(file, itemToReplace, context);
  await replaceFileService.replaceFile(itemToReplace.uuid, { fileId: newFileId, size: file.size });
  context.dispatch(fileVersionsActions.invalidateCache(itemToReplace.uuid));
};

const uploadFolder = async (
  root: IRoot,
  destinationUuid: string,
  { dispatch, selectedWorkspace, maxUploadFileSize }: NameCollisionContext,
) =>
  uploadFoldersWithTracking({
    payload: [{ root: { ...root }, currentFolderId: destinationUuid }],
    selectedWorkspace,
    dispatch,
    maxUploadFileSize,
  });

const uploadFile = async (
  file: File,
  destinationUuid: string,
  { dispatch }: NameCollisionContext,
  shouldSkipDuplicatesCheck = false,
) =>
  dispatch(
    storageThunks.uploadItemsThunk({
      files: [file],
      parentFolderId: destinationUuid,
      options: shouldSkipDuplicatesCheck ? { disableDuplicatedNamesCheck: true } : undefined,
    }),
  );

const canReplaceVersion = (pair: CollisionPair<IRoot | File>, { isVersioningEnabled }: NameCollisionContext) =>
  !isFolderUpload(pair.item) && isVersioningEnabled && isVersioningExtensionAllowed(pair.existing);

const trashAndUpload = async (
  pair: CollisionPair<IRoot | File>,
  destinationUuid: string,
  context: NameCollisionContext,
) => {
  await moveItemsToTrash([pair.existing]);
  if (isFolderUpload(pair.item)) {
    await uploadFolder(pair.item, destinationUuid, context);
  } else {
    await uploadFile(pair.item, destinationUuid, context, true);
  }
};

/**
 * Replaces each colliding drive item with the uploaded one. Files whose extension supports
 * versioning become a new version of the existing file; everything else is trashed and re-uploaded.
 */
const replaceAndUploadItems = async (
  pairs: CollisionPair<IRoot | File>[],
  destinationUuid: string,
  context: NameCollisionContext,
) => {
  for (const pair of pairs) {
    if (canReplaceVersion(pair, context)) {
      await replaceFileVersion(pair.item as File, pair.existing, context);
    } else {
      await trashAndUpload(pair, destinationUuid, context);
    }
    context.dispatch(fetchSortedFolderContentThunk(destinationUuid));
  }
};

/**
 * Uploads each item next to the existing one, letting the upload flow pick a unique name.
 */
const keepAndUploadItems = async (items: (IRoot | File)[], destinationUuid: string, context: NameCollisionContext) => {
  for (const item of items) {
    if (isFolderUpload(item)) {
      await uploadFolder(item, destinationUuid, context);
    } else {
      await uploadFile(item, destinationUuid, context);
    }
    context.dispatch(fetchSortedFolderContentThunk(destinationUuid));
  }
};

/**
 * Applies the chosen resolution to items that collide while being uploaded. Existing items are
 * matched to the uploaded ones by position.
 */
const resolveUploadCollision = async (
  { operation, items, existingItems, destinationUuid }: ResolveUploadCollisionParams,
  context: NameCollisionContext,
) => {
  if (operation === 'keep') {
    await keepAndUploadItems(items, destinationUuid, context);
    return;
  }

  const pairs = items.map((item, index) => ({ item, existing: existingItems[index] }));
  await replaceAndUploadItems(pairs, destinationUuid, context);
};

/**
 * Applies the chosen collision resolution to the given items.
 */
export const resolveCollision = async (
  { operationType, items, ...params }: ResolveCollisionParams,
  context: NameCollisionContext,
): Promise<void> => {
  if (operationType === 'move') {
    await resolveMoveCollision({ ...params, items: items as DriveItemData[] }, context);
  } else {
    await resolveUploadCollision({ ...params, items: items as (IRoot | File)[] }, context);
  }
};
