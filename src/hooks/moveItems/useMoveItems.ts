import { FileStatus } from '@internxt/sdk/dist/drive/storage/types';
import { AppView } from 'app/core/types';
import { DriveItemData } from 'app/drive/types';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';
import { useAppDispatch } from 'app/store/hooks';
import { storageActions } from 'app/store/slices/storage';
import storageThunks from 'app/store/slices/storage/storage.thunks';
import { getCollisionGroups } from 'app/store/slices/storage/storage.thunks/renameItemsThunk';
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

  const processMove = async ({ finalDestinationId, items }: ProcessMoveProps) => {
    const groups = await getCollisionGroups([{ destinationUuid: finalDestinationId, items }]);
    const [group] = groups;

    if (!group) return { areItemsMoved: false, totalItemsMoved: [] };

    if (group.duplicatedItems.length > 0) {
      dispatch(
        uiActions.setIsNameCollisionDialogOpen({
          open: true,
          info: {
            groups,
            operation: 'move',
          },
        }),
      );
    }

    if (group.unrepeatedItems.length > 0) {
      await dispatch(
        storageThunks.moveItemsThunk({
          items: group.unrepeatedItems,
          destinationFolderId: finalDestinationId,
        }),
      );
    }

    return {
      areItemsMoved: group.unrepeatedItems.length > 0,
      totalItemsMoved: group.unrepeatedItems,
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
        const key = item.parent?.uuid as string;
        map.set(key, [...(map.get(key) ?? []), item]);
        return map;
      }, new Map<string, DriveItemData[]>());

      const groups = await getCollisionGroups(
        [...restorableByDestination.entries()].map(([destinationUuid, groupItems]) => ({
          destinationUuid,
          items: groupItems,
        })),
      );

      const collisionGroups = groups.filter((g) => g.duplicatedItems.length > 0);
      if (collisionGroups.length > 0) {
        dispatch(
          uiActions.setIsNameCollisionDialogOpen({
            open: true,
            info: {
              groups: collisionGroups,
              operation: 'move',
            },
          }),
        );
      }

      const totalItemsMoved: DriveItemData[] = [];
      for (const group of groups) {
        if (group.unrepeatedItems.length > 0) {
          await dispatch(
            storageThunks.moveItemsThunk({
              items: group.unrepeatedItems,
              destinationFolderId: group.destinationUuid,
            }),
          );
          totalItemsMoved.push(...group.unrepeatedItems);
        }
      }

      if (totalItemsMoved.length > 0) {
        notificationsService.show({ text: t('notificationMessages.restoreItems'), type: ToastType.Success });
        dispatch(storageActions.popItemsToDelete(totalItemsMoved));
      }

      if (needsDestination.length > 0) {
        dispatch(storageActions.setItemsToMove(needsDestination));
        dispatch(uiActions.setIsMoveItemsDialogOpen(true));
      }
    });

  const moveItemsFromDialog = ({
    finalDestinationId,
    items,
  }: Omit<ProcessMoveProps, 'displayTaskLogger'>): Promise<void> =>
    withErrorHandler(async () => {
      await processMove({ finalDestinationId, items, displayTaskLogger: true });
    });

  return {
    restoreItemFromTrash,
    restoreItemsFromTrash,
    moveItemsFromDialog,
  };
};
