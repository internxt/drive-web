import { useEffect, useState } from 'react';
import _ from 'lodash';
import newStorageService from '../../drive/services/new-storage.service';
import { DriveItemData } from '../../drive/types';

const DEFAULT_LIMIT = 50;

export const useBackupsPagination = (folderUuid: string | undefined, clearSelectedItems: () => void) => {
  const [areFetchingItems, setAreFetchingItems] = useState(true);
  const [currentItems, setCurrentItems] = useState<DriveItemData[]>([]);
  const [hasMoreItems, setHasMoreItems] = useState<boolean>(true);
  const [offset, setOffset] = useState<number>(0);

  useEffect(() => {
    getFolderContent();
  }, [folderUuid]);

  const getFolderContent = async () => {
    setAreFetchingItems(true);
    setCurrentItems([]);
    clearSelectedItems();
    setOffset(0);

    if (!folderUuid) return;

    const [folderContentPromise] = newStorageService.getFolderContentByUuid({
      folderUuid,
      limit: DEFAULT_LIMIT,
      offset: 0,
    });

    const response = await folderContentPromise;
    const files = response.files.map((file) => ({ ...file, isFolder: false, name: file.plainName }));
    const folders = response.children.map((folder) => ({ ...folder, isFolder: true, name: folder.plainName }));
    const items = _.concat(folders as DriveItemData[], files as DriveItemData[]);

    setCurrentItems(items);

    if (items.length >= DEFAULT_LIMIT) {
      setHasMoreItems(true);
      setOffset(DEFAULT_LIMIT);
    } else {
      setHasMoreItems(false);
    }

    setAreFetchingItems(false);
  };

  const getMorePaginatedItems = async () => {
    if (!folderUuid || !hasMoreItems) return;

    setAreFetchingItems(true);

    const [folderContentPromise] = newStorageService.getFolderContentByUuid({
      folderUuid,
      limit: DEFAULT_LIMIT,
      offset,
    });

    const folderContentResponse = await folderContentPromise;
    const files = folderContentResponse.files.map((file) => ({ ...file, isFolder: false, name: file.plainName }));
    const folders = folderContentResponse.children.map((folder) => ({
      ...folder,
      isFolder: true,
      name: folder.plainName,
    }));
    const items = _.concat(folders as DriveItemData[], files as DriveItemData[]);

    const totalCurrentItems = _.concat(currentItems, items);

    setCurrentItems(totalCurrentItems);

    if (items.length >= DEFAULT_LIMIT) {
      setHasMoreItems(true);
      setOffset((prevOffset) => prevOffset + DEFAULT_LIMIT);
    } else {
      setHasMoreItems(false);
    }

    setAreFetchingItems(false);
  };

  return {
    currentItems,
    areFetchingItems,
    hasMoreItems,
    getFolderContent,
    getMorePaginatedItems,
  };
};