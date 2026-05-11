import { FileStatus } from '@internxt/sdk/dist/drive/storage/types';
import { DriveFileData, DriveFolderData, DriveItemData } from 'app/drive/types';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';
import { RootState } from 'app/store';
import { useAppDispatch } from 'app/store/hooks';
import { storageActions } from 'app/store/slices/storage';
import storageThunks from 'app/store/slices/storage/storage.thunks';
import {
  handleRepeatedUploadingFiles,
  handleRepeatedUploadingFolders,
} from 'app/store/slices/storage/storage.thunks/renameItemsThunk';
import { IRoot } from 'app/store/slices/storage/types';
import { uiActions } from 'app/store/slices/ui';
import { t } from 'i18next';
import { useSelector } from 'react-redux';
import { errorService } from 'services';

interface ProcessMoveProps {
  finalDestinationId: string;
  items: DriveItemData[];
  displayTaskLogger?: boolean;
}

export const useMoveItems = () => {
  const dispatch = useAppDispatch();
  const itemsToMove: DriveItemData[] = useSelector((state: RootState) => state.storage.itemsToMove);
  const processMove = async ({ finalDestinationId, items, displayTaskLogger }: ProcessMoveProps) => {
    const processItems = items ?? itemsToMove;
    const files = processItems.filter((item) => item.type !== 'folder' || !item.isFolder) as DriveFileData[];
    const folders = processItems.filter((item) => item.type === 'folder' || item.isFolder) as (
      | IRoot
      | DriveFolderData
    )[];

    const filesWithoutDuplicates = await handleRepeatedUploadingFiles(files, dispatch, finalDestinationId);
    const foldersWithoutDuplicates = await handleRepeatedUploadingFolders(folders, dispatch, finalDestinationId);

    const itemsToMoveWithoutDuplicates = [...filesWithoutDuplicates, ...foldersWithoutDuplicates];

    if (itemsToMoveWithoutDuplicates.length > 0) {
      await dispatch(
        storageThunks.moveItemsThunk({
          items: itemsToMoveWithoutDuplicates as DriveItemData[],
          destinationFolderId: finalDestinationId,
          displayTaskLogger,
        }),
      );
    }
  };

  const restoreItemFromTrash = async ({ finalDestinationId, items }: Omit<ProcessMoveProps, 'displayTaskLogger'>) => {
    try {
      await processMove({
        finalDestinationId,
        items,
      });

      dispatch(storageActions.popItemsToDelete(items));
    } catch (error) {
      const castedError = errorService.castError(error);
      notificationsService.show({
        text: t('error.errorRestoringItemFromTrash'),
        type: ToastType.Error,
        requestId: castedError.requestId,
      });
    }
  };

  const restoreItemsFromTrash = async (items: DriveItemData[]) => {
    const restorable = items.filter((item) => item.parent?.status === FileStatus.EXISTS);
    const needsDestination = items.filter((item) => item.parent?.status !== FileStatus.EXISTS);

    await Promise.all(
      restorable.map((item) =>
        restoreItemFromTrash({
          finalDestinationId: item.parent!.uuid,
          items: [item],
        }),
      ),
    );

    if (needsDestination.length > 0) {
      dispatch(storageActions.setItemsToMove(needsDestination));
      dispatch(uiActions.setIsMoveItemsDialogOpen(true));
    }
  };

  const moveItemFromDialog = async ({ finalDestinationId, items }: Omit<ProcessMoveProps, 'displayTaskLogger'>) => {
    try {
      await processMove({
        finalDestinationId,
        items,
        displayTaskLogger: true,
      });
    } catch (error) {
      const castedError = errorService.castError(error);
      notificationsService.show({
        text: t('error.errorMovingItem'),
        type: ToastType.Error,
        requestId: castedError.requestId,
      });
    }
  };

  return {
    processMove,
    restoreItemFromTrash,
    restoreItemsFromTrash,
    moveItemFromDialog,
  };
};
