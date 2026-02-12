import { FC, useEffect, useMemo, useState } from 'react';
import { connect } from 'react-redux';
import NameCollisionDialog, { OPERATION_TYPE, OnSubmitPressed } from '.';
import { moveItemsToTrash } from 'views/Trash/services';
import { RootState } from 'app/store';
import { useAppDispatch, useAppSelector } from 'app/store/hooks';
import { storageActions, storageSelectors } from 'app/store/slices/storage';
import storageThunks from 'app/store/slices/storage/storage.thunks';
import { fetchSortedFolderContentThunk } from 'app/store/slices/storage/storage.thunks/fetchSortedFolderContentThunk';
import { uiActions } from 'app/store/slices/ui';
import { DriveItemData } from 'app/drive/types';
import { IRoot } from 'app/store/slices/storage/types';
import workspacesSelectors from 'app/store/slices/workspaces/workspaces.selectors';
import { uploadFoldersWithManager } from 'app/network/UploadFolderManager';
import replaceFileService from 'views/Drive/services/replaceFile.service';
import { Network, getEnvironmentConfig } from 'app/drive/services/network.service';
import { fileVersionsActions, fileVersionsSelectors } from 'app/store/slices/fileVersions';
import { isVersioningExtensionAllowed } from 'views/Drive/components/VersionHistory/utils';

type NameCollisionContainerProps = {
  currentFolderId: string;
  moveDestinationFolderId: string | null;
  filesToRename: (File | DriveItemData)[];
  driveFilesToRename: DriveItemData[];
  foldersToRename: (IRoot | DriveItemData)[];
  driveFoldersToRename: DriveItemData[];
};

const NameCollisionContainer: FC<NameCollisionContainerProps> = ({
  currentFolderId,
  moveDestinationFolderId,
  filesToRename,
  driveFilesToRename,
  foldersToRename,
  driveFoldersToRename,
}) => {
  const dispatch = useAppDispatch();
  const [repeatedItemsToUpload, setRepeatedItemsToUpload] = useState<(File | DriveItemData)[]>([]);
  const [driveRepeatedItems, setDriveRepeatedItems] = useState<DriveItemData[]>([]);
  const [repeatedFolderToUpload, setRepeatedFolderToUpload] = useState<(IRoot | DriveItemData)[]>([]);
  const [driveRepeatedFolder, setDriveRepeatedFolder] = useState<DriveItemData[]>([]);

  const isOpen = useAppSelector((state: RootState) => state.ui.isNameCollisionDialogOpen);
  const selectedWorkspace = useAppSelector(workspacesSelectors.getSelectedWorkspace);
  const isMoveDialog = useMemo(() => !!moveDestinationFolderId, [moveDestinationFolderId]);
  const folderId = useMemo(
    () => moveDestinationFolderId ?? currentFolderId,
    [moveDestinationFolderId, currentFolderId],
  );
  const limits = useAppSelector(fileVersionsSelectors.getLimits);
  const isVersioningEnabled = limits?.versioning?.enabled ?? false;

  const handleNewItems = (files: (File | DriveItemData)[], folders: (IRoot | DriveItemData)[]) => [
    ...files,
    ...folders,
  ];

  const newItems = useMemo(
    () => handleNewItems(repeatedItemsToUpload, repeatedFolderToUpload),
    [repeatedItemsToUpload, repeatedFolderToUpload],
  );

  const driveItems = useMemo(
    () => handleNewItems(driveRepeatedItems, driveRepeatedFolder),
    [driveRepeatedItems, driveRepeatedFolder],
  );

  useEffect(() => {
    setRepeatedItemsToUpload(filesToRename);
    setDriveRepeatedItems(driveFilesToRename);
  }, [filesToRename, driveFilesToRename]);

  useEffect(() => {
    setRepeatedFolderToUpload(foldersToRename);
    setDriveRepeatedFolder(driveFoldersToRename);
  }, [foldersToRename, driveFoldersToRename]);

  const closeRenameDialog = () => {
    dispatch(uiActions.setIsNameCollisionDialogOpen(false));
    dispatch(storageActions.setMoveDestinationFolderId(null));
  };

  const onCancelRenameDialogButtonPressed = () => {
    dispatch(uiActions.setIsNameCollisionDialogOpen(false));
    resetPendingToRenameFolders();
    resetPendingToRenameItems();
  };

  const resetPendingToRenameItems = () => {
    dispatch(storageActions.setFilesToRename([]));
    dispatch(storageActions.setDriveFilesToRename([]));
  };

  const resetPendingToRenameFolders = () => {
    dispatch(storageActions.setFoldersToRename([]));
    dispatch(storageActions.setDriveFoldersToRename([]));
  };

  const replaceAndMoveItem = async ({
    itemsToReplace,
    itemsToMove,
  }: {
    itemsToReplace: DriveItemData[];
    itemsToMove: DriveItemData[];
  }) => {
    await moveItemsToTrash(itemsToReplace);
    dispatch(
      storageThunks.moveItemsThunk({
        items: itemsToMove,
        destinationFolderId: moveDestinationFolderId as string,
      }),
    );
  };

  const keepAndMoveItem = async (itemsToUpload: DriveItemData[]) => {
    await dispatch(
      storageThunks.renameItemsThunk({
        items: itemsToUpload,
        destinationFolderId: folderId,
        onRenameSuccess: (itemToUpload: DriveItemData) =>
          dispatch(
            storageThunks.moveItemsThunk({
              items: [itemToUpload],
              destinationFolderId: moveDestinationFolderId as string,
            }),
          ),
      }),
    );
  };

  const uploadFileAndGetFileId = async (file: File, itemToReplace: DriveItemData) => {
    const { bridgeUser, bridgePass, encryptionKey, bucketId } = getEnvironmentConfig(!!selectedWorkspace);
    const network = new Network(bridgeUser, bridgePass, encryptionKey);

    const taskId = `replace-${itemToReplace.uuid}-${Date.now()}`;

    const [uploadPromise] = network.uploadFile(
      bucketId,
      {
        filecontent: file,
        filesize: file.size,
        progressCallback: () => {},
      },
      { taskId },
    );

    return await uploadPromise;
  };

  const replaceFileVersion = async (file: File, itemToReplace: DriveItemData) => {
    const newFileId = await uploadFileAndGetFileId(file, itemToReplace);
    await replaceFileService.replaceFile(itemToReplace.uuid, {
      fileId: newFileId,
      size: file.size,
    });
    dispatch(fileVersionsActions.invalidateCache(itemToReplace.uuid));
  };

  const trashAndUpload = async (file: File, itemToReplace: DriveItemData) => {
    await moveItemsToTrash([itemToReplace]);
    await dispatch(
      storageThunks.uploadItemsThunk({
        files: [file],
        parentFolderId: folderId,
        options: {
          disableDuplicatedNamesCheck: true,
        },
      }),
    );
  };

  const replaceAndUploadItem = async ({
    itemsToReplace,
    itemsToUpload,
  }: {
    itemsToReplace: DriveItemData[];
    itemsToUpload: (IRoot | File)[];
  }) => {
    for (let i = 0; i < itemsToUpload.length; i++) {
      const itemToUpload = itemsToUpload[i];
      const itemToReplace = itemsToReplace[i];

      if ((itemToUpload as IRoot).fullPathEdited) {
        await moveItemsToTrash([itemToReplace]);
        await uploadFoldersWithManager({
          payload: [
            {
              root: { ...(itemToUpload as IRoot) },
              currentFolderId: folderId,
            },
          ],
          selectedWorkspace,
          dispatch,
        });
      } else {
        const file = itemToUpload as File;
        const canReplaceVersion = isVersioningEnabled && isVersioningExtensionAllowed(itemToReplace);
        canReplaceVersion ? await replaceFileVersion(file, itemToReplace) : await trashAndUpload(file, itemToReplace);
      }

      dispatch(fetchSortedFolderContentThunk(folderId));
    }
  };

  const keepAndUploadItem = async (itemsToUpload: (IRoot | File)[]) => {
    itemsToUpload.forEach((itemToUpload) => {
      if ((itemToUpload as IRoot).fullPathEdited) {
        uploadFoldersWithManager({
          payload: [
            {
              root: { ...(itemToUpload as IRoot) },
              currentFolderId: folderId,
            },
          ],
          selectedWorkspace,
          dispatch,
        }).then(() => {
          dispatch(fetchSortedFolderContentThunk(folderId));
        });
      } else {
        dispatch(
          storageThunks.uploadItemsThunk({
            files: [itemToUpload as File],
            parentFolderId: folderId,
          }),
        ).then(() => {
          dispatch(fetchSortedFolderContentThunk(folderId));
        });
      }
    });
  };

  const triggerSelectedOptinsOnSubmit = async ({
    operationType,
    operation,
    itemsToUpload,
    itemsToReplace,
  }: OnSubmitPressed) => {
    switch (operationType + operation) {
      case 'move' + 'keep':
        await keepAndMoveItem(itemsToUpload as DriveItemData[]);
        break;
      case 'move' + 'replace':
        await replaceAndMoveItem({
          itemsToReplace: itemsToReplace as DriveItemData[],
          itemsToMove: itemsToUpload as DriveItemData[],
        });
        break;
      case 'upload' + 'keep':
        await keepAndUploadItem(itemsToUpload as (File | IRoot)[]);
        break;
      case 'upload' + 'replace':
        await replaceAndUploadItem({
          itemsToReplace: itemsToReplace as DriveItemData[],
          itemsToUpload: itemsToUpload as (File | IRoot)[],
        });
        break;
    }
  };

  return (
    <NameCollisionDialog
      isOpen={isOpen}
      newItems={newItems as (File | IRoot)[]}
      driveItems={driveItems as (DriveItemData | IRoot)[]}
      onCancelButtonPressed={onCancelRenameDialogButtonPressed}
      onSubmitButtonPressed={triggerSelectedOptinsOnSubmit}
      onCloseDialog={closeRenameDialog}
      operationType={isMoveDialog ? OPERATION_TYPE.MOVE : OPERATION_TYPE.UPLOAD}
    />
  );
};
export default connect((state: RootState) => {
  const currentFolderId: string = storageSelectors.currentFolderId(state);

  return {
    currentFolderId,
    filesToRename: state.storage.filesToRename,
    driveFilesToRename: state.storage.driveFilesToRename,
    foldersToRename: state.storage.foldersToRename,
    driveFoldersToRename: state.storage.driveFoldersToRename,
    moveDestinationFolderId: state.storage.moveDestinationFolderId,
  };
})(NameCollisionContainer);
