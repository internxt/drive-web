import { FC, useMemo } from 'react';
import NameCollisionDialog, { OnSubmitPressed } from '.';
import { moveItemsToTrash } from 'views/Trash/services';
import { RootState } from 'app/store';
import { useAppDispatch, useAppSelector } from 'app/store/hooks';
import { storageActions } from 'app/store/slices/storage';
import storageThunks from 'app/store/slices/storage/storage.thunks';
import { fetchSortedFolderContentThunk } from 'app/store/slices/storage/storage.thunks/fetchSortedFolderContentThunk';
import { uiActions } from 'app/store/slices/ui';
import { DriveItemData } from 'app/drive/types';
import { IRoot } from 'app/store/slices/storage/types';
import workspacesSelectors from 'app/store/slices/workspaces/workspaces.selectors';
import { uploadFoldersWithTracking } from 'app/drive/services/folder.service/uploadFoldersWithTracking';
import replaceFileService from 'views/Drive/services/replaceFile.service';
import { Network, getEnvironmentConfig } from 'app/drive/services/network.service';
import { fileVersionsActions, fileVersionsSelectors } from 'app/store/slices/fileVersions';
import { isVersioningExtensionAllowed } from 'views/Drive/components/VersionHistory/utils';
import { checkFolderDuplicated } from 'app/store/slices/storage/folderUtils/checkFolderDuplicated';
import { getUniqueFolderName } from 'app/store/slices/storage/folderUtils/getUniqueFolderName';
import { getUniqueFilename } from 'app/store/slices/storage/fileUtils/getUniqueFilename';
import { checkDuplicatedFiles } from 'app/store/slices/storage/fileUtils/checkDuplicatedFiles';
import { CollisionGroup } from 'app/store/slices/storage/storage.model';
import {
  handleRepeatedUploadingFiles,
  handleRepeatedUploadingFolders,
} from 'app/store/slices/storage/storage.thunks/renameItemsThunk';
import { MoveItemPayload } from 'app/store/slices/storage/storage.thunks/moveItemsThunk';

const NameCollisionContainer: FC = () => {
  const dispatch = useAppDispatch();

  const isOpen = useAppSelector((state: RootState) => state.ui.isNameCollisionDialogOpen);
  const collisionDialogInfo = useAppSelector((state: RootState) => state.ui.nameCollisionDialogInfo);
  const collisionGroups = useMemo(() => collisionDialogInfo?.groups ?? [], [collisionDialogInfo]);
  const operationType = collisionDialogInfo?.operation;
  const newItems = useMemo(() => collisionGroups.flatMap((g) => g.duplicatedItems), [collisionGroups]);
  const existingItems = useMemo(() => collisionGroups.flatMap((g) => g.existingItems), [collisionGroups]);
  const remainingItemsCount = useMemo(() => existingItems.length, [existingItems]);

  const selectedWorkspace = useAppSelector(workspacesSelectors.getSelectedWorkspace);
  const limits = useAppSelector(fileVersionsSelectors.getLimits);
  const maxUploadFileSize = useAppSelector(fileVersionsSelectors.getMaxFileSizeLimit);
  const isVersioningEnabled = limits?.versioning?.enabled ?? false;

  const closeDialog = () => {
    dispatch(uiActions.setIsNameCollisionDialogOpen({ open: false, info: undefined }));
  };

  const replaceAndMoveSingleItem = async (
    itemToUpload: DriveItemData,
    itemToReplace: DriveItemData,
    destinationUuid: string,
  ) => {
    await moveItemsToTrash([itemToReplace]);
    await dispatch(
      storageThunks.moveItemsThunk({
        items: [itemToUpload],
        destinationFolderId: destinationUuid,
      }),
    );
  };

  const replaceAndMoveItem = async (group: CollisionGroup) => {
    const itemsToUpload = group.duplicatedItems as DriveItemData[];
    const itemsToReplace = group.existingItems;

    for (let i = 0; i < itemsToUpload.length; i++) {
      await replaceAndMoveSingleItem(itemsToUpload[i], itemsToReplace[i], group.destinationUuid);
    }
  };

  const keepAndMoveSingleItem = async (item: DriveItemData, destinationUuid: string) => {
    let itemParsed: MoveItemPayload;

    if (item.isFolder) {
      const { duplicatedFoldersResponse } = await checkFolderDuplicated([item], destinationUuid);
      const finalName = await getUniqueFolderName(
        item.plainName ?? item.name,
        duplicatedFoldersResponse as DriveItemData[],
        destinationUuid,
      );
      itemParsed = { ...item, name: finalName, plain_name: finalName, newItemName: finalName };
    } else {
      const { duplicatedFilesResponse } = await checkDuplicatedFiles([item], destinationUuid);
      const finalName = await getUniqueFilename(item.name, item.type, duplicatedFilesResponse, destinationUuid);
      itemParsed = { ...item, name: finalName, plainName: finalName, plain_name: finalName, newItemName: finalName };
    }

    await dispatch(
      storageThunks.moveItemsThunk({
        items: [itemParsed],
        destinationFolderId: destinationUuid,
      }),
    );
  };

  const keepAndMoveItem = async (group: CollisionGroup) => {
    for (const item of group.duplicatedItems as DriveItemData[]) {
      await keepAndMoveSingleItem(item, group.destinationUuid);
    }
  };

  const uploadFileAndGetFileId = async (file: File, itemToReplace: DriveItemData) => {
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

  const replaceFileVersion = async (file: File, itemToReplace: DriveItemData) => {
    const newFileId = await uploadFileAndGetFileId(file, itemToReplace);
    await replaceFileService.replaceFile(itemToReplace.uuid, { fileId: newFileId, size: file.size });
    dispatch(fileVersionsActions.invalidateCache(itemToReplace.uuid));
  };

  const replaceAndUploadSingleItem = async (
    itemToUpload: IRoot | File,
    itemToReplace: DriveItemData,
    destinationUuid: string,
  ) => {
    if ((itemToUpload as IRoot).fullPathEdited) {
      await moveItemsToTrash([itemToReplace]);
      await uploadFoldersWithTracking({
        payload: [{ root: { ...(itemToUpload as IRoot) }, currentFolderId: destinationUuid }],
        selectedWorkspace,
        dispatch,
        maxUploadFileSize,
      });
    } else {
      const file = itemToUpload as File;
      const canReplaceVersion = isVersioningEnabled && isVersioningExtensionAllowed(itemToReplace);
      if (canReplaceVersion) {
        await replaceFileVersion(file, itemToReplace);
      } else {
        await moveItemsToTrash([itemToReplace]);
        await dispatch(
          storageThunks.uploadItemsThunk({
            files: [file],
            parentFolderId: destinationUuid,
            options: { disableDuplicatedNamesCheck: true },
          }),
        );
      }
    }

    dispatch(fetchSortedFolderContentThunk(destinationUuid));
  };

  const replaceAndUploadItem = async (group: CollisionGroup) => {
    const itemsToUpload = group.duplicatedItems as (IRoot | File)[];
    const itemsToReplace = group.existingItems;

    for (let i = 0; i < itemsToUpload.length; i++) {
      await replaceAndUploadSingleItem(itemsToUpload[i], itemsToReplace[i], group.destinationUuid);
    }
  };

  const uploadNewFilesOnly = async (files: File[], destinationUuid: string) => {
    const { unrepeatedItems: newFiles } = await handleRepeatedUploadingFiles(files, destinationUuid);
    if (newFiles.length === 0) return;

    await dispatch(
      storageThunks.uploadItemsThunk({
        files: newFiles as File[],
        parentFolderId: destinationUuid,
        options: { disableDuplicatedNamesCheck: true },
      }),
    );
  };

  const uploadNewFolders = async (folders: IRoot[], destinationUuid: string) => {
    if (folders.length === 0) return;

    await uploadFoldersWithTracking({
      payload: folders.map((root) => ({ root, currentFolderId: destinationUuid })),
      selectedWorkspace,
      dispatch,
      maxUploadFileSize,
    });
  };

  /**
   * Merges a skipped folder upload into its existing counterpart: files that already
   * exist are left untouched, new files and new subfolders are uploaded into the
   * existing folder, and colliding subfolders are merged recursively so the folder
   * structure is preserved.
   */
  const mergeSkipFolderUpload = async (root: IRoot, existingFolderUuid: string) => {
    await uploadNewFilesOnly(root.childrenFiles, existingFolderUuid);

    const {
      unrepeatedItems: newFolders,
      repeatedItems: collidingFolders,
      existingItems: existingFolders,
    } = await handleRepeatedUploadingFolders(root.childrenFolders, existingFolderUuid);

    await uploadNewFolders(newFolders as IRoot[], existingFolderUuid);

    for (const collidingFolder of collidingFolders as IRoot[]) {
      const existingFolder = existingFolders.find((folder) => folder.plainName === collidingFolder.name);
      if (existingFolder) {
        await mergeSkipFolderUpload(collidingFolder, existingFolder.uuid);
      }
    }
  };

  /**
   * Skipping an uploaded file is a no-op (the existing file stays untouched), while
   * skipping an uploaded folder merges its new content into the existing folder.
   */
  const skipAndUploadSingleItem = async (
    itemToUpload: IRoot | File,
    itemToReplace: DriveItemData,
    destinationUuid: string,
  ) => {
    const isFolderUpload = !!(itemToUpload as IRoot).fullPathEdited;
    if (!isFolderUpload) return;

    await mergeSkipFolderUpload(itemToUpload as IRoot, itemToReplace.uuid);
    dispatch(fetchSortedFolderContentThunk(destinationUuid));
  };

  const skipAndUploadItem = async (group: CollisionGroup) => {
    const itemsToUpload = group.duplicatedItems as (IRoot | File)[];
    const itemsToReplace = group.existingItems;

    for (let i = 0; i < itemsToUpload.length; i++) {
      await skipAndUploadSingleItem(itemsToUpload[i], itemsToReplace[i], group.destinationUuid);
    }
  };

  const keepAndUploadSingleItem = async (itemToUpload: IRoot | File, destinationUuid: string) => {
    if ((itemToUpload as IRoot).fullPathEdited) {
      await uploadFoldersWithTracking({
        payload: [{ root: { ...(itemToUpload as IRoot) }, currentFolderId: destinationUuid }],
        selectedWorkspace,
        dispatch,
        maxUploadFileSize,
      });
    } else {
      await dispatch(
        storageThunks.uploadItemsThunk({
          files: [itemToUpload as File],
          parentFolderId: destinationUuid,
        }),
      );
    }
    dispatch(fetchSortedFolderContentThunk(destinationUuid));
  };

  const keepAndUploadItem = async (group: CollisionGroup) => {
    for (const itemToUpload of group.duplicatedItems as (IRoot | File)[]) {
      await keepAndUploadSingleItem(itemToUpload, group.destinationUuid);
    }
  };

  const triggerSelectedOptionsOnSubmit = async ({ operationType, operation, applyToAll }: OnSubmitPressed) => {
    if (applyToAll) {
      for (const group of collisionGroups) {
        switch (operationType + operation) {
          case 'move' + 'keep':
            await keepAndMoveItem(group);
            dispatch(storageActions.popItemsToDelete(group.duplicatedItems as DriveItemData[]));
            break;
          case 'move' + 'replace':
            await replaceAndMoveItem(group);
            dispatch(storageActions.popItemsToDelete(group.duplicatedItems as DriveItemData[]));
            break;
          case 'upload' + 'keep':
            await keepAndUploadItem(group);
            break;
          case 'upload' + 'replace':
            await replaceAndUploadItem(group);
            break;
          case 'upload' + 'skip':
            await skipAndUploadItem(group);
            break;
          case 'move' + 'skip':
            break;
        }
      }
      closeDialog();
      return;
    }

    const groupIndex = collisionGroups.findIndex((g) => g.duplicatedItems.length > 0);
    if (groupIndex === -1) {
      closeDialog();
      return;
    }

    const group = collisionGroups[groupIndex];
    const itemToUpload = group.duplicatedItems[0];
    const itemToReplace = group.existingItems[0];

    switch (operationType + operation) {
      case 'move' + 'keep':
        await keepAndMoveSingleItem(itemToUpload as DriveItemData, group.destinationUuid);
        dispatch(storageActions.popItemsToDelete([itemToUpload as DriveItemData]));
        break;
      case 'move' + 'replace':
        await replaceAndMoveSingleItem(itemToUpload as DriveItemData, itemToReplace, group.destinationUuid);
        dispatch(storageActions.popItemsToDelete([itemToUpload as DriveItemData]));
        break;
      case 'upload' + 'keep':
        await keepAndUploadSingleItem(itemToUpload as IRoot | File, group.destinationUuid);
        break;
      case 'upload' + 'replace':
        await replaceAndUploadSingleItem(itemToUpload as IRoot | File, itemToReplace, group.destinationUuid);
        break;
      case 'upload' + 'skip':
        await skipAndUploadSingleItem(itemToUpload as IRoot | File, itemToReplace, group.destinationUuid);
        break;
      case 'move' + 'skip':
        break;
    }

    const remainingGroups = collisionGroups
      .map((g, idx) =>
        idx === groupIndex
          ? { ...g, duplicatedItems: g.duplicatedItems.slice(1), existingItems: g.existingItems.slice(1) }
          : g,
      )
      .filter((g) => g.duplicatedItems.length > 0);

    if (remainingGroups.length > 0) {
      dispatch(
        uiActions.setIsNameCollisionDialogOpen({
          open: true,
          info: { groups: remainingGroups, operation: operationType },
        }),
      );
    } else {
      closeDialog();
    }
  };

  if (!collisionDialogInfo) return null;

  return (
    <NameCollisionDialog
      isOpen={isOpen}
      newItems={newItems as (File | IRoot)[]}
      driveItems={existingItems}
      onCancelButtonPressed={closeDialog}
      onSubmitButtonPressed={triggerSelectedOptionsOnSubmit}
      onCloseDialog={closeDialog}
      operationType={operationType as 'move' | 'upload'}
      remainingItemsCount={remainingItemsCount}
    />
  );
};

export default NameCollisionContainer;
