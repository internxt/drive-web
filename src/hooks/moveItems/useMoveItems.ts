import { FileStatus } from '@internxt/sdk/dist/drive/storage/types';
import { AppView } from 'app/core/types';
import { DriveFileData, DriveFolderData, DriveItemData } from 'app/drive/types';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';
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
import { errorService, navigationService } from 'services';

interface ProcessMoveProps {
  finalDestinationId: string;
  items: DriveItemData[];
  displayTaskLogger?: boolean;
}

export const useMoveItems = () => {
  const dispatch = useAppDispatch();
  const processMove = async ({ finalDestinationId, items, displayTaskLogger }: ProcessMoveProps) => {
    const files = items.filter((item) => !item.isFolder) as DriveFileData[];
    const folders = items.filter((item) => item.isFolder) as (IRoot | DriveFolderData)[];

    const filesWithoutDuplicates = await handleRepeatedUploadingFiles(files, dispatch, finalDestinationId, true);
    const foldersWithoutDuplicates = await handleRepeatedUploadingFolders(folders, dispatch, finalDestinationId, true);

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
      areItemsMoved: itemsToMoveWithoutDuplicates.length > 0,
      totalItemsMoved: itemsToMoveWithoutDuplicates as DriveItemData[],
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
        const { areItemsMoved } = await processMove({ finalDestinationId: item.parent.uuid, items: [item] });

        if (!areItemsMoved) return;

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
      const restorableItems = items.filter((item) => item.parent?.status === FileStatus.EXISTS);
      const needsDestination = items.filter((item) => item.parent?.status !== FileStatus.EXISTS);

      const restorableByDestination = restorableItems.reduce((map, item) => {
        const key = item.parent?.uuid;
        map.set(key, [...(map.get(key) ?? []), item]);
        return map;
      }, new Map<string | undefined, DriveItemData[]>());

      const restoredItems: Awaited<ReturnType<typeof processMove>>[] = [];
      for (const [destinationId, groupItems] of restorableByDestination.entries()) {
        const result = await processMove({ finalDestinationId: destinationId as string, items: groupItems });
        restoredItems.push(result);
      }

      const totalItemsMovedConcat = restoredItems.flatMap((item) => item.totalItemsMoved);

      if (totalItemsMovedConcat.length > 0) {
        notificationsService.show({ text: t('notificationMessages.restoreItems'), type: ToastType.Success });
        dispatch(storageActions.popItemsToDelete(totalItemsMovedConcat));
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
