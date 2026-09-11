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
import { CollisionItem, CollisionPair, getCollisionPairs, isFolderUpload } from './nameCollision.utils';

export type CollisionOperationType = 'move' | 'upload';
export type CollisionOperation = 'keep' | 'replace' | 'skip';

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
 * Moves the items to the destination under a name that does not collide with anything there.
 */
const keepAndMoveItems = async (
  items: DriveItemData[],
  destinationUuid: string,
  { dispatch }: NameCollisionContext,
): Promise<void> => {
  if (items.length === 0) return;

  const itemsParsed = await Promise.all(items.map((item) => getUniqueNameMovePayload(item, destinationUuid)));
  await dispatch(storageThunks.moveItemsThunk({ items: itemsParsed, destinationFolderId: destinationUuid }));
};

/**
 * Trashes the colliding drive items and then moves the incoming ones into their place.
 */
const replaceAndMoveItems = async (
  pairs: CollisionPair<DriveItemData>[],
  destinationUuid: string,
  { dispatch }: NameCollisionContext,
): Promise<void> => {
  if (pairs.length === 0) return;

  await moveItemsToTrash(pairs.map((pair) => pair.existing));
  await dispatch(
    storageThunks.moveItemsThunk({
      items: pairs.map((pair) => pair.item),
      destinationFolderId: destinationUuid,
    }),
  );
};

/**
 * Applies the chosen resolution to items that collide while being moved, then removes them
 * from the pending-deletion list. Skipped items are left untouched.
 */
const resolveMoveCollision = async (
  { operation, items, existingItems, destinationUuid }: ResolveMoveCollisionParams,
  context: NameCollisionContext,
) => {
  if (operation === 'skip') return;

  if (operation === 'keep') {
    await keepAndMoveItems(items, destinationUuid, context);
  } else {
    await replaceAndMoveItems(getCollisionPairs(items, existingItems), destinationUuid, context);
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

const uploadFiles = async (
  files: File[],
  destinationUuid: string,
  { dispatch }: NameCollisionContext,
  shouldSkipDuplicatesCheck = false,
) => {
  if (files.length === 0) return;

  await dispatch(
    storageThunks.uploadItemsThunk({
      files,
      parentFolderId: destinationUuid,
      options: { disableDuplicatedNamesCheck: shouldSkipDuplicatesCheck },
    }),
  );
};

const uploadFolders = async (
  folders: IRoot[],
  destinationUuid: string,
  { dispatch, selectedWorkspace, maxUploadFileSize }: NameCollisionContext,
) => {
  if (folders.length === 0) return;

  await uploadFoldersWithTracking({
    payload: folders.map((root) => ({ root: { ...root }, currentFolderId: destinationUuid })),
    selectedWorkspace,
    dispatch,
    maxUploadFileSize,
  });
};

const uploadItems = async (
  items: (IRoot | File)[],
  destinationUuid: string,
  context: NameCollisionContext,
  shouldSkipDuplicatesCheck = false,
) => {
  const folders = items.filter(isFolderUpload);
  const files = items.filter((item): item is File => !isFolderUpload(item));

  await uploadFolders(folders, destinationUuid, context);
  await uploadFiles(files, destinationUuid, context, shouldSkipDuplicatesCheck);
};

const isVersionedFilePair = (pair: CollisionPair<IRoot | File>, { isVersioningEnabled }: NameCollisionContext) =>
  !isFolderUpload(pair.item) && isVersioningEnabled && isVersioningExtensionAllowed(pair.existing);

/**
 * Versioned files are replaced one at a time because that upload bypasses the upload queue.
 */
const replaceFileVersions = async (pairs: CollisionPair<IRoot | File>[], context: NameCollisionContext) => {
  for (const pair of pairs) {
    await replaceFileVersion(pair.item as File, pair.existing, context);
  }
};

const trashAndUploadItems = async (
  pairs: CollisionPair<IRoot | File>[],
  destinationUuid: string,
  context: NameCollisionContext,
) => {
  if (pairs.length === 0) return;

  await moveItemsToTrash(pairs.map((pair) => pair.existing));
  await uploadItems(
    pairs.map((pair) => pair.item),
    destinationUuid,
    context,
    true,
  );
};

/**
 * Replaces the colliding drive items with the uploaded ones. Files whose extension supports
 * versioning become a new version of the existing file; everything else is trashed and re-uploaded.
 */
const replaceAndUploadItems = async (
  pairs: CollisionPair<IRoot | File>[],
  destinationUuid: string,
  context: NameCollisionContext,
): Promise<void> => {
  if (pairs.length === 0) return;

  await trashAndUploadItems(
    pairs.filter((pair) => !isVersionedFilePair(pair, context)),
    destinationUuid,
    context,
  );
  await replaceFileVersions(
    pairs.filter((pair) => isVersionedFilePair(pair, context)),
    context,
  );

  context.dispatch(fetchSortedFolderContentThunk(destinationUuid));
};

/**
 * Uploads the items next to the existing ones, letting the upload flow pick a unique name.
 */
const keepAndUploadItems = async (
  items: (IRoot | File)[],
  destinationUuid: string,
  context: NameCollisionContext,
): Promise<void> => {
  if (items.length === 0) return;

  await uploadItems(items, destinationUuid, context);
  context.dispatch(fetchSortedFolderContentThunk(destinationUuid));
};

/**
 * Applies the chosen resolution to items that collide while being uploaded. Skipped items are
 * left untouched.
 */
const resolveUploadCollision = async (
  { operation, items, existingItems, destinationUuid }: ResolveUploadCollisionParams,
  context: NameCollisionContext,
) => {
  if (operation === 'skip') return;

  if (operation === 'keep') {
    await keepAndUploadItems(items, destinationUuid, context);
  } else {
    await replaceAndUploadItems(getCollisionPairs(items, existingItems), destinationUuid, context);
  }
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
