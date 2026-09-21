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
import {
  handleRepeatedUploadingFiles,
  handleRepeatedUploadingFolders,
} from 'app/store/slices/storage/storage.thunks/renameItemsThunk';
import { IRoot } from 'app/store/slices/storage/types';
import { isVersioningExtensionAllowed } from 'views/Drive/components/VersionHistory/utils';
import replaceFileService from 'views/Drive/services/replaceFile.service';
import { moveItemsToTrash } from 'views/Trash/services';
import {
  CollisionItem,
  CollisionPair,
  getCollisionPairs,
  getUnpairedItems,
  groupByNameSeries,
  isFolderUpload,
  isNameTakenBy,
  splitReplacingPairs,
} from './nameCollision.utils';

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

interface ItemMove {
  item: DriveItemData;
  payload: MoveItemPayload;
}

const getDestinationDuplicates = async (item: DriveItemData, destinationUuid: string): Promise<DriveItemData[]> => {
  if (item.isFolder) {
    const { duplicatedFoldersResponse } = await checkFolderDuplicated([item], destinationUuid);
    return duplicatedFoldersResponse as DriveItemData[];
  }

  const { duplicatedFilesResponse } = await checkDuplicatedFiles([item], destinationUuid);
  return duplicatedFilesResponse as DriveItemData[];
};

const getLookupName = (item: DriveItemData): string => (item.isFolder ? (item.plainName ?? item.name) : item.name);

const getNextUniqueName = (
  item: DriveItemData,
  name: string,
  takenItems: DriveItemData[],
  destinationUuid: string,
): Promise<string> => {
  if (item.isFolder) {
    return getUniqueFolderName(name, takenItems, destinationUuid);
  }

  return getUniqueFilename(name, item.type, takenItems, destinationUuid);
};

/**
 * Re-checks the names already assigned in this batch after every attempt, because the server knows
 * nothing about names that are assigned but not moved yet.
 */
const getUniqueNameInBatch = async (
  item: DriveItemData,
  destinationUuid: string,
  renamedItems: DriveItemData[],
): Promise<string> => {
  const destinationDuplicates = await getDestinationDuplicates(item, destinationUuid);
  const takenItems = [...destinationDuplicates, ...renamedItems];
  let uniqueName = getLookupName(item);

  do {
    uniqueName = await getNextUniqueName(item, uniqueName, takenItems, destinationUuid);
  } while (isNameTakenBy(uniqueName, item, renamedItems));

  return uniqueName;
};

const getRenamedMovePayload = (item: DriveItemData, newName: string): MoveItemPayload => {
  const renamedItem = { ...item, name: newName, plain_name: newName, newItemName: newName };
  return item.isFolder ? renamedItem : { ...renamedItem, plainName: newName };
};

const getSeriesMoves = async (seriesItems: DriveItemData[], destinationUuid: string): Promise<ItemMove[]> => {
  const renamedItems: DriveItemData[] = [];
  const moves: ItemMove[] = [];

  for (const item of seriesItems) {
    const uniqueName = await getUniqueNameInBatch(item, destinationUuid, renamedItems);
    renamedItems.push({ ...item, name: uniqueName, plainName: uniqueName });
    moves.push({ item, payload: getRenamedMovePayload(item, uniqueName) });
  }

  return moves;
};

const getUniqueNameMoves = async (items: DriveItemData[], destinationUuid: string): Promise<ItemMove[]> => {
  const series = groupByNameSeries(items, getLookupName);
  const movesBySeries = await Promise.all(series.map((seriesItems) => getSeriesMoves(seriesItems, destinationUuid)));

  return movesBySeries.flat();
};

const moveItem = async (
  payload: MoveItemPayload,
  destinationUuid: string,
  { dispatch }: NameCollisionContext,
): Promise<boolean> => {
  try {
    await dispatch(storageThunks.moveItemsThunk({ items: [payload], destinationFolderId: destinationUuid })).unwrap();
    return true;
  } catch {
    return false;
  }
};

/**
 * Moves every item on its own, because the move thunk settles once for the whole batch and would
 * hide which items made it to the destination when one of them fails.
 */
const moveItems = async (
  moves: ItemMove[],
  destinationUuid: string,
  context: NameCollisionContext,
): Promise<DriveItemData[]> => {
  const isMovedByIndex = await Promise.all(moves.map(({ payload }) => moveItem(payload, destinationUuid, context)));
  const succeededMoves = moves.filter((_, index) => isMovedByIndex[index]);

  return succeededMoves.map(({ item }) => item);
};

/**
 * Moves the items to the destination under a name that does not collide with anything there.
 */
const keepAndMoveItems = async (
  items: DriveItemData[],
  destinationUuid: string,
  context: NameCollisionContext,
): Promise<DriveItemData[]> => {
  if (items.length === 0) return [];

  const moves = await getUniqueNameMoves(items, destinationUuid);
  return moveItems(moves, destinationUuid, context);
};

/**
 * Trashes the colliding drive items and then moves the incoming ones into their place.
 */
const trashAndMoveItems = async (
  replacingPairs: CollisionPair<DriveItemData>[],
  destinationUuid: string,
  context: NameCollisionContext,
): Promise<DriveItemData[]> => {
  if (replacingPairs.length === 0) return [];

  const replacingMoves: ItemMove[] = replacingPairs.map(({ item }) => ({ item, payload: item }));

  await moveItemsToTrash(replacingPairs.map((pair) => pair.existing));
  return moveItems(replacingMoves, destinationUuid, context);
};

const replaceAndMoveItems = async (
  items: DriveItemData[],
  existingItems: DriveItemData[],
  destinationUuid: string,
  context: NameCollisionContext,
): Promise<DriveItemData[]> => {
  const pairs = getCollisionPairs(items, existingItems);
  const unpairedItems = getUnpairedItems(items, existingItems);
  const { replacingPairs, leftoverItems } = splitReplacingPairs(pairs);
  const itemsToKeep = [...leftoverItems, ...unpairedItems];

  const replacingItems = await trashAndMoveItems(replacingPairs, destinationUuid, context);
  const keptItems = await keepAndMoveItems(itemsToKeep, destinationUuid, context);

  return [...replacingItems, ...keptItems];
};

/**
 * Applies the chosen resolution to items that collide while being moved, then removes them
 * from the pending-deletion list once moved. Skipped items are left untouched.
 */
const resolveMoveCollision = async (
  { operation, items, existingItems, destinationUuid }: ResolveMoveCollisionParams,
  context: NameCollisionContext,
) => {
  if (operation === 'skip') return;

  let movedItems: DriveItemData[];

  if (operation === 'keep') {
    movedItems = await keepAndMoveItems(items, destinationUuid, context);
  } else {
    movedItems = await replaceAndMoveItems(items, existingItems, destinationUuid, context);
  }
  context.dispatch(storageActions.popItemsToDelete(movedItems));
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

const uploadNewFilesOnly = async (files: File[], destinationUuid: string, context: NameCollisionContext) => {
  const { unrepeatedItems: newFiles } = await handleRepeatedUploadingFiles(files, destinationUuid);
  await uploadFiles(newFiles as File[], destinationUuid, context, true);
};

/**
 * Merges a skipped folder upload into its existing counterpart: files that already
 * exist are left untouched, new files and new subfolders are uploaded into the
 * existing folder, and colliding subfolders are merged recursively so the folder
 * structure is preserved.
 */
const mergeSkipFolderUpload = async (root: IRoot, existingFolderUuid: string, context: NameCollisionContext) => {
  await uploadNewFilesOnly(root.childrenFiles, existingFolderUuid, context);

  const {
    unrepeatedItems: newFolders,
    repeatedItems: collidingFolders,
    existingItems: existingFolders,
  } = await handleRepeatedUploadingFolders(root.childrenFolders, existingFolderUuid);

  await uploadFolders(newFolders as IRoot[], existingFolderUuid, context);

  for (const collidingFolder of collidingFolders as IRoot[]) {
    const existingFolder = existingFolders.find((folder) => folder.plainName === collidingFolder.name);
    if (existingFolder) {
      await mergeSkipFolderUpload(collidingFolder, existingFolder.uuid, context);
    }
  }
};

/**
 * Skipping uploaded files is a no-op (the existing files stay untouched), while
 * skipping uploaded folders merges their new content into the existing folders.
 */
const skipAndUploadItems = async (
  pairs: CollisionPair<IRoot | File>[],
  destinationUuid: string,
  context: NameCollisionContext,
): Promise<void> => {
  const folderPairs = pairs.filter((pair) => isFolderUpload(pair.item));
  if (folderPairs.length === 0) return;

  await Promise.all(folderPairs.map((pair) => mergeSkipFolderUpload(pair.item as IRoot, pair.existing.uuid, context)));
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
 * Applies the chosen resolution to items that collide while being uploaded. Skipped files are
 * left untouched, while skipped folders merge their new content into the existing folder.
 */
const resolveUploadCollision = async (
  { operation, items, existingItems, destinationUuid }: ResolveUploadCollisionParams,
  context: NameCollisionContext,
) => {
  if (operation === 'keep') {
    await keepAndUploadItems(items, destinationUuid, context);
    return;
  }

  const pairs = getCollisionPairs(items, existingItems);
  if (operation === 'replace') {
    await replaceAndUploadItems(pairs, destinationUuid, context);
  } else {
    await skipAndUploadItems(pairs, destinationUuid, context);
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
