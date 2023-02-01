import { FC, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { connect } from 'react-redux';
import NameCollisionDialog, { OnSubmitPressed, OPERATION_TYPE } from '.';
import moveItemsToTrash from '../../../../use_cases/trash/move-items-to-trash';
import { RootState } from '../../../store';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { storageActions, storageSelectors } from '../../../store/slices/storage';
import storageThunks from '../../../store/slices/storage/storage.thunks';
import { IRoot } from '../../../store/slices/storage/storage.thunks/uploadFolderThunk';
import { uiActions } from '../../../store/slices/ui';
import { DriveItemData } from '../../types';

type NameCollisionContainerProps = {
  currentFolderId: number;
  moveDestinationFolderId: number | null;
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
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const [repeatedItemsToUpload, setRepeatedItemsToUpload] = useState<(File | DriveItemData)[]>([]);
  const [driveRepeatedItems, setDriveRepeatedItems] = useState<DriveItemData[]>([]);
  const [repeatedFolderToUpload, setRepeatedFolderToUpload] = useState<(IRoot | DriveItemData)[]>([]);
  const [driveRepeatedFolder, setDriveRepeatedFolder] = useState<DriveItemData[]>([]);

  const isOpen = useAppSelector((state: RootState) => state.ui.isNameCollisionDialogOpen);
  const isMoveDialog = useMemo(() => !!moveDestinationFolderId, [moveDestinationFolderId]);
  const folderId = useMemo(
    () => moveDestinationFolderId ?? currentFolderId,
    [moveDestinationFolderId, currentFolderId],
  );
  const handleNewItems = (files: any[], folders: any[]) => [...files, ...folders];

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
    resetPendintToRenameFolders();
    resetPendintToRenameItems();
  };

  const resetPendintToRenameItems = () => {
    dispatch(storageActions.setFilesToRename([]));
    dispatch(storageActions.setDriveFilesToRename([]));
  };

  const resetPendintToRenameFolders = () => {
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
    await moveItemsToTrash(itemsToReplace, t);
    dispatch(
      storageThunks.moveItemsThunk({
        items: itemsToMove,
        destinationFolderId: moveDestinationFolderId as number,
      }),
    );
  };

  const keepAndMoveItem = async (itemsToUpload: DriveItemData[]) => {
    await dispatch(storageThunks.renameItemsThunk({ items: itemsToUpload, destinationFolderId: folderId }));
    dispatch(
      storageThunks.moveItemsThunk({
        items: itemsToUpload,
        destinationFolderId: moveDestinationFolderId as number,
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
    await moveItemsToTrash(itemsToReplace, t);

    itemsToUpload.forEach((itemToUpload) => {
      if ((itemToUpload as IRoot).fullPathEdited) {
        dispatch(
          storageThunks.uploadFolderThunkNoCheck({
            root: { ...(itemToUpload as IRoot) },
            currentFolderId: folderId,
          }),
        );
      } else {
        dispatch(
          storageThunks.uploadItemsThunkNoCheck({
            files: [itemToUpload] as File[],
            parentFolderId: folderId,
          }),
        );
      }
    });
  };

  const keepAndUploadItem = async (itemsToUpload: (IRoot | File)[]) => {
    itemsToUpload.forEach((itemToUpload) => {
      if ((itemToUpload as IRoot).fullPathEdited) {
        dispatch(
          storageThunks.uploadFolderThunk({
            root: { ...(itemToUpload as IRoot) },
            currentFolderId: folderId,
          }),
        );
      } else {
        dispatch(
          storageThunks.uploadItemsThunk({
            files: [itemToUpload as File],
            parentFolderId: folderId,
          }),
        );
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
      newItems={newItems}
      driveItems={driveItems}
      onCancelButtonPressed={onCancelRenameDialogButtonPressed}
      onSubmitButtonPressed={triggerSelectedOptinsOnSubmit}
      onCloseDialog={closeRenameDialog}
      operationType={isMoveDialog ? OPERATION_TYPE.MOVE : OPERATION_TYPE.UPLOAD}
    />
  );
};
export default connect((state: RootState) => {
  const currentFolderId: number = storageSelectors.currentFolderId(state);

  return {
    currentFolderId,
    filesToRename: state.storage.filesToRename,
    driveFilesToRename: state.storage.driveFilesToRename,
    foldersToRename: state.storage.foldersToRename,
    driveFoldersToRename: state.storage.driveFoldersToRename,
    moveDestinationFolderId: state.storage.moveDestinationFolderId,
  };
})(NameCollisionContainer);
