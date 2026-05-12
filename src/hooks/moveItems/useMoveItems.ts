import { FileStatus } from '@internxt/sdk/dist/drive/storage/types';
import { AppView } from 'app/core/types';
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
import { errorService, navigationService } from 'services';

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
    const files = processItems.filter((item) => !item.isFolder) as DriveFileData[];
    const folders = processItems.filter((item) => item.isFolder) as (IRoot | DriveFolderData)[];

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

    return {
      itemsMoved: itemsToMoveWithoutDuplicates.length > 0,
    };
  };

  const goFolder = async (folderUuid: string, workspacesToken?: string) => {
    try {
      navigationService.pushFolder(folderUuid, workspacesToken);
    } catch (error) {
      navigationService.push(AppView.FolderFileNotFound, { itemType: 'folder' });
      errorService.reportError(error);
    }
  };

  const withErrorHandler = async (fn: () => Promise<void>): Promise<void> => {
    try {
      await fn();
    } catch (error) {
      const castedError = errorService.castError(error);
      notificationsService.show({
        text: t('error.movingItem'),
        type: ToastType.Error,
        requestId: castedError.requestId,
      });
    }
  };

  const restoreItemFromTrash = (item: DriveItemData): Promise<void> =>
    withErrorHandler(async () => {
      if (item.parent?.status === FileStatus.EXISTS) {
        dispatch(storageActions.setMoveDestinationFolderId(item.parent.uuid));
        const { itemsMoved } = await processMove({ finalDestinationId: item.parent.uuid, items: [item] });

        if (!itemsMoved) return;

        const goToDriveId = notificationsService.show({
          text: t('notificationMessages.restoreItems'),
          type: ToastType.Success,
          action: {
            text: t('notificationMessages.goToDrive'),
            onClick: () => {
              goFolder(item.parent?.uuid as string);
              notificationsService.dismiss(goToDriveId);
            },
          },
        });
        dispatch(storageActions.popItemsToDelete([item]));
      } else {
        dispatch(storageActions.setItemsToMove([item]));
        dispatch(uiActions.setIsMoveItemsDialogOpen(true));
      }
    });

  const restoreItemsFromTrash = (items: DriveItemData[]): Promise<void> =>
    withErrorHandler(async () => {
      const restorable = items.filter((item) => item.parent?.status === FileStatus.EXISTS);
      const needsDestination = items.filter((item) => item.parent?.status !== FileStatus.EXISTS);

      await Promise.all(
        restorable.map((item) => {
          dispatch(storageActions.setMoveDestinationFolderId(item.parent?.uuid as string));
          return processMove({ finalDestinationId: item.parent!.uuid, items: [item] });
        }),
      );

      if (restorable.length > 0) {
        notificationsService.show({ text: t('notificationMessages.restoreItems'), type: ToastType.Success });
        dispatch(storageActions.popItemsToDelete(restorable));
      }

      if (needsDestination.length > 0) {
        dispatch(storageActions.setItemsToMove(needsDestination));
        dispatch(uiActions.setIsMoveItemsDialogOpen(true));
      }
    });

  const moveItemFromDialog = ({
    finalDestinationId,
    items,
  }: Omit<ProcessMoveProps, 'displayTaskLogger'>): Promise<void> =>
    withErrorHandler(async () => {
      await processMove({ finalDestinationId, items, displayTaskLogger: true });
    });

  return {
    restoreItemFromTrash,
    restoreItemsFromTrash,
    moveItemFromDialog,
  };
};
