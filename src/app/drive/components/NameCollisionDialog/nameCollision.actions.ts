import { WorkspaceData } from '@internxt/sdk/dist/workspaces';
import { DriveItemData } from 'app/drive/types';
import { AppDispatch } from 'app/store';
import { storageActions } from 'app/store/slices/storage';
import { checkDuplicatedFiles } from 'app/store/slices/storage/fileUtils/checkDuplicatedFiles';
import { getUniqueFilename } from 'app/store/slices/storage/fileUtils/getUniqueFilename';
import { checkFolderDuplicated } from 'app/store/slices/storage/folderUtils/checkFolderDuplicated';
import { getUniqueFolderName } from 'app/store/slices/storage/folderUtils/getUniqueFolderName';
import storageThunks from 'app/store/slices/storage/storage.thunks';
import { MoveItemPayload } from 'app/store/slices/storage/storage.thunks/moveItemsThunk';
import { moveItemsToTrash } from 'views/Trash/services';

export type CollisionOperation = 'keep' | 'replace';

export interface NameCollisionContext {
  dispatch: AppDispatch;
  selectedWorkspace: WorkspaceData | null;
  maxUploadFileSize: number;
  isVersioningEnabled: boolean;
}

export interface ResolveMoveCollisionParams {
  operation: CollisionOperation;
  items: DriveItemData[];
  existingItems: DriveItemData[];
  destinationUuid: string;
}

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
export const resolveMoveCollision = async (
  { operation, items, existingItems, destinationUuid }: ResolveMoveCollisionParams,
  context: NameCollisionContext,
): Promise<void> => {
  if (operation === 'keep') {
    await keepAndMoveItems(items, destinationUuid, context);
  } else {
    await replaceAndMoveItems(items, existingItems, destinationUuid, context);
  }
  context.dispatch(storageActions.popItemsToDelete(items));
};
