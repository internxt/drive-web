import { OrderSettings } from 'app/core/types';
import { useState, useCallback } from 'react';

const TRASH_PAGINATION_OFFSET = 50;

interface UseTrashPaginationProps {
  getTrashPaginated?: (
    limit: number,
    offset: number | undefined,
    type: 'files' | 'folders',
    root: boolean,
    sort: 'plainName' | 'updatedAt',
    order: 'ASC' | 'DESC',
    folderId?: number | undefined,
  ) => Promise<{ finished: boolean; itemsRetrieved: number }>;
  folderOnTrashLength: number;
  filesOnTrashLength: number;
  setHasMoreItems: (hasMoreItems: boolean) => void;
  order: OrderSettings;
}

interface UseTrashPaginationHook {
  isLoadingTrashItems: boolean;
  hasMoreTrashFolders: boolean;
  setHasMoreTrashFolders: (hasMoreTrashFolders: boolean) => void;
  setIsLoadingTrashItems: (isLoadingTrashItems: boolean) => void;
  getMoreTrashItems: () => Promise<void>;
}

export const useTrashPagination = ({
  getTrashPaginated,
  folderOnTrashLength,
  filesOnTrashLength,
  setHasMoreItems,
  order,
}: UseTrashPaginationProps): UseTrashPaginationHook => {
  const [isLoadingTrashItems, setIsLoadingTrashItems] = useState(false);
  const [hasMoreTrashFolders, setHasMoreTrashFolders] = useState(true);

  const getMoreTrashFolders = useCallback(async () => {
    setIsLoadingTrashItems(true);
    if (getTrashPaginated) {
      const result = await getTrashPaginated(
        TRASH_PAGINATION_OFFSET,
        folderOnTrashLength,
        'folders',
        true,
        order.by === 'name' ? 'plainName' : 'updatedAt',
        order.direction,
      );
      const existsMoreFolders = result && !result.finished;
      setHasMoreTrashFolders(existsMoreFolders);
    }
    setIsLoadingTrashItems(false);
  }, [getTrashPaginated, TRASH_PAGINATION_OFFSET, folderOnTrashLength, order]);

  const getMoreTrashFiles = useCallback(async () => {
    setIsLoadingTrashItems(true);
    if (getTrashPaginated) {
      const result = await getTrashPaginated(
        TRASH_PAGINATION_OFFSET,
        filesOnTrashLength,
        'files',
        true,
        order.by === 'name' ? 'plainName' : 'updatedAt',
        order.direction,
      );
      const existsMoreItems = result && !result.finished;
      setHasMoreItems(existsMoreItems);
    }
    setIsLoadingTrashItems(false);
  }, [getTrashPaginated, TRASH_PAGINATION_OFFSET, filesOnTrashLength, setHasMoreItems, order]);

  const getMoreTrashItems = useCallback(() => {
    return hasMoreTrashFolders ? getMoreTrashFolders() : getMoreTrashFiles();
  }, [hasMoreTrashFolders, getMoreTrashFolders, getMoreTrashFiles]);

  return {
    isLoadingTrashItems,
    hasMoreTrashFolders,
    setHasMoreTrashFolders,
    setIsLoadingTrashItems,
    getMoreTrashItems,
  };
};
