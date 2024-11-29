import { t } from 'i18next';
import { SdkFactory } from '../../app/core/factory/sdk';
import errorService from '../../app/core/services/error.service';
import localStorageService from '../../app/core/services/local-storage.service';
import workspacesService from '../../app/core/services/workspace.service';
import { DriveItemData } from '../../app/drive/types';
import notificationsService, { ToastType } from '../../app/notifications/services/notifications.service';
import { store } from '../../app/store';
import { storageActions } from '../../app/store/slices/storage';

const getTrash = async (): Promise<void> => {
  const trashClient = SdkFactory.getNewApiInstance().createTrashClient();
  const itemsInTrash = await trashClient.getTrash();
  itemsInTrash.children.forEach((folder) => {
    Object.assign(folder, { isFolder: true });
  });
  const items: DriveItemData[] = [
    ...(itemsInTrash.files as DriveItemData[]),
    ...(itemsInTrash.children as DriveItemData[]),
  ];
  store.dispatch(storageActions.clearSelectedItems());
  store.dispatch(storageActions.setItemsOnTrash(items));
};

const getTrashPaginated = async (
  limit: number,
  offset: number | undefined,
  type: 'files' | 'folders',
  root: boolean,
  sort: 'plainName' | 'updatedAt',
  order: 'ASC' | 'DESC',
  folderId?: number | undefined,
): Promise<{ finished: boolean; itemsRetrieved: number }> => {
  try {
    const trashClient = SdkFactory.getNewApiInstance().createTrashClient();
    const itemsInTrash = await trashClient.getTrashedItemsSorted(limit, offset, type, root, sort, order, folderId);

    const parsedTrashItems = itemsInTrash.result.map(
      (item) => ({ ...item, isFolder: type === 'folders', name: item.plainName }) as unknown as DriveItemData,
    );
    const itemslength = itemsInTrash.result.length;
    const areLastItems = itemslength < limit;

    store.dispatch(storageActions.clearSelectedItems());
    store.dispatch(storageActions.addItemsOnTrash(parsedTrashItems));

    if (type === 'folders') {
      store.dispatch(storageActions.addFoldersOnTrashLength(itemslength));
    } else {
      store.dispatch(storageActions.addFilesOnTrashLength(itemslength));
    }

    return { finished: areLastItems, itemsRetrieved: itemslength };
  } catch (error) {
    notificationsService.show({
      text: t('error.errorLoadingTrashItems'),
      type: ToastType.Error,
    });

    errorService.reportError(error);
    return { finished: false, itemsRetrieved: 0 };
  }
};

const getWorkspaceTrashPaginated = async (
  limit: number,
  offset: number | undefined,
  type: 'files' | 'folders',
): Promise<{ finished: boolean; itemsRetrieved: number }> => {
  try {
    const workspace = localStorageService.getB2BWorkspace();
    const trashType = type === 'files' ? 'file' : 'folder';
    const itemsInTrash = await workspacesService.getTrashItems(workspace?.workspace.id as string, trashType, offset);

    const parsedTrashItems = itemsInTrash.result.map(
      (item) => ({ ...item, isFolder: type === 'folders', name: item.plainName }) as unknown as DriveItemData,
    );
    const itemslength = itemsInTrash.result.length;
    const areLastItems = itemslength < limit;

    store.dispatch(storageActions.clearSelectedItems());
    store.dispatch(storageActions.addItemsOnTrash(parsedTrashItems));

    if (type === 'folders') {
      store.dispatch(storageActions.addFoldersOnTrashLength(itemslength));
    } else {
      store.dispatch(storageActions.addFilesOnTrashLength(itemslength));
    }

    return { finished: areLastItems, itemsRetrieved: itemslength };
  } catch (error) {
    notificationsService.show({
      text: t('error.errorLoadingTrashItems'),
      type: ToastType.Error,
    });

    errorService.reportError(error);
    return { finished: false, itemsRetrieved: 0 };
  }
};
export { getTrash, getTrashPaginated, getWorkspaceTrashPaginated };
