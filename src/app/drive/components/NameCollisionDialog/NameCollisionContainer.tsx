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
import { MoveItemPayload } from 'app/store/slices/storage/storage.thunks/moveItemsThunk';

const NameCollisionContainer: FC = () => {
  const dispatch = useAppDispatch();

  const isOpen = useAppSelector((state: RootState) => state.ui.isNameCollisionDialogOpen);
  const collisionDialogInfo = useAppSelector((state: RootState) => state.ui.nameCollisionDialogInfo);
  const collisionGroups = useMemo(() => collisionDialogInfo?.groups ?? [], [collisionDialogInfo]);
  const operationType = collisionDialogInfo?.operation;
  const newItems = useMemo(() => collisionGroups.flatMap((g) => g.duplicatedItems), [collisionGroups]);
  const existingItems = useMemo(() => collisionGroups.flatMap((g) => g.existingItems), [collisionGroups]);

  const selectedWorkspace = useAppSelector(workspacesSelectors.getSelectedWorkspace);
  const limits = useAppSelector(fileVersionsSelectors.getLimits);
  const maxUploadFileSize = useAppSelector(fileVersionsSelectors.getMaxFileSizeLimit);
  const isVersioningEnabled = limits?.versioning?.enabled ?? false;

  const closeDialog = () => {
    dispatch(uiActions.setIsNameCollisionDialogOpen({ open: false, info: undefined }));
  };

  const replaceAndMoveItem = async (group: CollisionGroup) => {
    await moveItemsToTrash(group.existingItems);
    await dispatch(
      storageThunks.moveItemsThunk({
        items: group.duplicatedItems as DriveItemData[],
        destinationFolderId: group.destinationUuid,
      }),
    );
  };

  const keepAndMoveItem = async (group: CollisionGroup) => {
    for (const item of group.duplicatedItems as DriveItemData[]) {
      let itemParsed: MoveItemPayload;

      if (item.isFolder) {
        const { duplicatedFoldersResponse } = await checkFolderDuplicated([item], group.destinationUuid);
        const finalName = await getUniqueFolderName(
          item.plainName ?? item.name,
          duplicatedFoldersResponse as DriveItemData[],
          group.destinationUuid,
        );
        itemParsed = { ...item, name: finalName, plain_name: finalName, newItemName: finalName };
      } else {
        const { duplicatedFilesResponse } = await checkDuplicatedFiles([item], group.destinationUuid);
        const finalName = await getUniqueFilename(item.name, item.type, duplicatedFilesResponse, group.destinationUuid);
        itemParsed = { ...item, name: finalName, plainName: finalName, plain_name: finalName, newItemName: finalName };
      }

      await dispatch(
        storageThunks.moveItemsThunk({
          items: [itemParsed],
          destinationFolderId: group.destinationUuid,
        }),
      );
    }
  };

  const uploadFileAndGetFileId = async (file: File, itemToReplace: DriveItemData) => {
    const { bridgeUser, bridgePass, encryptionKey, bucketId } = getEnvironmentConfig(!!selectedWorkspace);
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

  const replaceAndUploadItem = async (group: CollisionGroup) => {
    const itemsToUpload = group.duplicatedItems as (IRoot | File)[];
    const itemsToReplace = group.existingItems;

    for (let i = 0; i < itemsToUpload.length; i++) {
      const itemToUpload = itemsToUpload[i];
      const itemToReplace = itemsToReplace[i];

      if ((itemToUpload as IRoot).fullPathEdited) {
        await moveItemsToTrash([itemToReplace]);
        await uploadFoldersWithTracking({
          payload: [{ root: { ...(itemToUpload as IRoot) }, currentFolderId: group.destinationUuid }],
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
              parentFolderId: group.destinationUuid,
              options: { disableDuplicatedNamesCheck: true },
            }),
          );
        }
      }

      dispatch(fetchSortedFolderContentThunk(group.destinationUuid));
    }
  };

  const keepAndUploadItem = async (group: CollisionGroup) => {
    for (const itemToUpload of group.duplicatedItems as (IRoot | File)[]) {
      if ((itemToUpload as IRoot).fullPathEdited) {
        await uploadFoldersWithTracking({
          payload: [{ root: { ...(itemToUpload as IRoot) }, currentFolderId: group.destinationUuid }],
          selectedWorkspace,
          dispatch,
          maxUploadFileSize,
        });
      } else {
        await dispatch(
          storageThunks.uploadItemsThunk({
            files: [itemToUpload as File],
            parentFolderId: group.destinationUuid,
          }),
        );
      }
      dispatch(fetchSortedFolderContentThunk(group.destinationUuid));
    }
  };

  const triggerSelectedOptionsOnSubmit = async ({ operationType, operation }: OnSubmitPressed) => {
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
      }
    }
    closeDialog();
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
    />
  );
};

export default NameCollisionContainer;
