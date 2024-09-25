import { useEffect, useState, useCallback } from 'react';
import _ from 'lodash';
import { t } from 'i18next';
import newStorageService from '../../drive/services/new-storage.service';
import { DriveItemData } from '../../drive/types';
import errorService from '../../core/services/error.service';
import notificationsService, { ToastType } from '../../notifications/services/notifications.service';

const DEFAULT_LIMIT = 50;

export const useBackupsPagination = (folderUuid: string | undefined, clearSelectedItems: () => void) => {
  const [areFetchingItems, setAreFetchingItems] = useState(true);
  const [currentItems, setCurrentItems] = useState<DriveItemData[]>([]);
  const [hasMoreItems, setHasMoreItems] = useState<boolean>(true);
  const [offset, setOffset] = useState<number>(0);

  useEffect(() => {
    if (folderUuid) {
      clearSelectedItems();
      setCurrentItems([]);
      setOffset(0);
      fetchItems(true);
    }
  }, [folderUuid]);

  const handleError = useCallback((error: Error) => {
    errorService.reportError(error.message);
    notificationsService.show({
      type: ToastType.Error,
      text: t('notificationMessages.errorWhileFetchingMoreItems'),
    });
    setHasMoreItems(false);
  }, []);

  const fetchItems = useCallback(
    async (isFirstLoad: boolean) => {
      if (!folderUuid) return;

      setAreFetchingItems(true);

      const currentOffset = isFirstLoad ? 0 : offset;

      try {
        const [folderContentPromise] = newStorageService.getFolderContentByUuid({
          folderUuid,
          limit: DEFAULT_LIMIT,
          offset: currentOffset,
        });

        const response = await folderContentPromise;
        const files = response.files.map((file) => ({ ...file, isFolder: false, name: file.plainName }));
        const folders = response.children.map((folder) => ({ ...folder, isFolder: true, name: folder.plainName }));
        const items = _.concat(folders as DriveItemData[], files as DriveItemData[]);
        const thereAreMoreItems = items.length >= DEFAULT_LIMIT;

        setCurrentItems((prevItems) => {
          const totalItems = isFirstLoad ? items : _.concat(prevItems, items);
          return totalItems;
        });

        if (thereAreMoreItems) {
          setHasMoreItems(true);
          setOffset((prevOffset) => prevOffset + DEFAULT_LIMIT);
        } else {
          setHasMoreItems(false);
        }
      } catch (err) {
        handleError(err as Error);
      } finally {
        setAreFetchingItems(false);
      }
    },
    [folderUuid, offset, handleError],
  );

  const getMorePaginatedItems = useCallback(async () => {
    if (hasMoreItems && !areFetchingItems) {
      await fetchItems(false);
    }
  }, [hasMoreItems, areFetchingItems, fetchItems]);

  const updateCurrentItemsList = (newItemsList: DriveItemData[]) => {
    setCurrentItems(newItemsList);
  };

  return {
    currentItems,
    areFetchingItems,
    hasMoreItems,
    getFolderContent: fetchItems,
    getMorePaginatedItems,
    updateCurrentItemsList,
  };
};
