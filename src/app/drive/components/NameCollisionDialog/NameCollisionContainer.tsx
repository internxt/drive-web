import { FC, useMemo } from 'react';
import NameCollisionDialog, { NameCollisionDialogProps, OnSubmitPressed, OPERATION_TYPE } from '.';
import moveItemsToTrash from '../../../../use_cases/trash/move-items-to-trash';
import { useAppDispatch } from '../../../store/hooks';
import { storageActions } from '../../../store/slices/storage';
import storageThunks from '../../../store/slices/storage/storage.thunks';
import { IRoot } from '../../../store/slices/storage/storage.thunks/uploadFolderThunk';
import { uiActions } from '../../../store/slices/ui';
import { DriveItemData } from '../../types';

type NameCollisionContainerProps = Pick<NameCollisionDialogProps, 'isOpen' | 'newItems' | 'driveItems'> & {
  currentFolderId: number;
  moveDestinationFolderId: number | null;
};

const NameCollisionContainer: FC<NameCollisionContainerProps> = ({
  isOpen,
  newItems,
  driveItems,
  currentFolderId,
  moveDestinationFolderId,
}) => {
  const dispatch = useAppDispatch();
  const isMoveDialog = useMemo(() => !!moveDestinationFolderId, [moveDestinationFolderId]);
  const folderId = useMemo(
    () => moveDestinationFolderId ?? currentFolderId,
    [moveDestinationFolderId, currentFolderId],
  );

  const closeRenameDialog = () => {
    dispatch(uiActions.setIsRenameDialogOpen(false));
    dispatch(storageActions.setMoveDestinationFolderId(null));
  };

  const onCancelRenameDialogButtonPressed = () => {
    dispatch(uiActions.setIsRenameDialogOpen(false));
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
    await moveItemsToTrash(itemsToReplace);
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
    await moveItemsToTrash(itemsToReplace);

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

export { NameCollisionContainer };
