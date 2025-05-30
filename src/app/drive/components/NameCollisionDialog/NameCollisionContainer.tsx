import { FC, useEffect, useMemo, useState } from 'react';
import { connect } from 'react-redux';
import NameCollisionDialog, { OPERATION_TYPE, OnSubmitPressed } from '.';
import moveItemsToTrash from '../../../../use_cases/trash/move-items-to-trash';
import errorService from '../../../core/services/error.service';
import { RootState } from '../../../store';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { storageActions, storageSelectors } from '../../../store/slices/storage';
import storageThunks from '../../../store/slices/storage/storage.thunks';
import { fetchSortedFolderContentThunk } from '../../../store/slices/storage/storage.thunks/fetchSortedFolderContentThunk';
import { uiActions } from '../../../store/slices/ui';
import { DriveItemData } from '../../types';
import { IRoot } from '../../../store/slices/storage/types';
import workspacesSelectors from '../../../store/slices/workspaces/workspaces.selectors';
import { uploadFoldersWithManager } from '../../../network/UploadFolderManager';

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

  const replaceAndUploadItem = async ({
    itemsToReplace,
    itemsToUpload,
  }: {
    itemsToReplace: DriveItemData[];
    itemsToUpload: (IRoot | File)[];
  }) => {
    await moveItemsToTrash(itemsToReplace);

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
            files: [itemToUpload] as File[],
            parentFolderId: folderId,
            options: {
              disableDuplicatedNamesCheck: true,
            },
          }),
        ).then(() => {
          dispatch(fetchSortedFolderContentThunk(folderId));
        });
      }
    });
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
        errorService.addBreadcrumb({
          level: 'info',
          category: 'select-option',
          message: 'Move and rename items',
          data: {
            currentFolderId: folderId,
            itemsToUpload: itemsToUpload,
          },
        });
        await keepAndMoveItem(itemsToUpload as DriveItemData[]);
        break;
      case 'move' + 'replace':
        errorService.addBreadcrumb({
          level: 'info',
          category: 'select-option',
          message: 'Move and replace items',
          data: {
            currentFolderId: folderId,
            itemsToUpload: itemsToUpload,
          },
        });
        await replaceAndMoveItem({
          itemsToReplace: itemsToReplace as DriveItemData[],
          itemsToMove: itemsToUpload as DriveItemData[],
        });
        break;
      case 'upload' + 'keep':
        errorService.addBreadcrumb({
          level: 'info',
          category: 'select-option',
          message: 'Upload and rename items',
          data: {
            currentFolderId: folderId,
            itemsToUpload: itemsToUpload,
          },
        });
        await keepAndUploadItem(itemsToUpload as (File | IRoot)[]);
        break;
      case 'upload' + 'replace':
        errorService.addBreadcrumb({
          level: 'info',
          category: 'select-option',
          message: 'Upload and replace items',
          data: {
            currentFolderId: folderId,
            itemsToUpload: itemsToUpload,
          },
        });
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
