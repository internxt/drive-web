import { BreadcrumbItemData } from '@internxt/ui';
import { transformDraggedItems } from 'app/core/services/drag-and-drop.service';
import { DragAndDropType } from 'app/core/types';
import { FolderPath, DriveItemData } from 'app/drive/types';
import { AppDispatch } from 'app/store';
import { storageActions } from 'app/store/slices/storage';
import storageThunks from 'app/store/slices/storage/storage.thunks';
import {
  handleRepeatedUploadingFiles,
  handleRepeatedUploadingFolders,
} from 'app/store/slices/storage/storage.thunks/renameItemsThunk';
import { DropTargetMonitor } from 'react-dnd';
import { NativeTypes } from 'react-dnd-html5-backend';

export const getFolderPath = (item: BreadcrumbItemData, namePath: FolderPath[]): string => {
  const breadcrumbIndex = namePath.findIndex((level) => level.uuid === item.uuid);
  const namePathDestinationArray = namePath.slice(0, breadcrumbIndex + 1).map((level) => level.name);
  namePathDestinationArray[0] = '';
  return namePathDestinationArray.join('/');
};

export const getItemsToMoveWhenSelected = (
  droppedData: DriveItemData,
  selectedItems: DriveItemData[],
): DriveItemData[] => {
  return [...selectedItems, droppedData].filter(
    (a, index, self) => index === self.findIndex((b) => a.id === b.id && a.isFolder === b.isFolder),
  );
};

export const getItemsToMoveWhenNotSelected = (droppedData: DriveItemData): DriveItemData[] => {
  return [droppedData];
};

export const handleDriveItemDrop = async (
  droppedData: DriveItemData,
  isSomeItemSelected: boolean,
  selectedItems: DriveItemData[],
  item: BreadcrumbItemData,
  dispatch: AppDispatch,
) => {
  let itemsToMove: DriveItemData[];
  if (isSomeItemSelected) {
    itemsToMove = getItemsToMoveWhenSelected(droppedData, selectedItems);
  } else {
    itemsToMove = getItemsToMoveWhenNotSelected(droppedData);
  }

  const filesToMove: DriveItemData[] = [];
  const foldersToMove = itemsToMove.filter((i) => {
    if (!i.isFolder) filesToMove.push(i);
    return i.isFolder;
  });

  dispatch(storageActions.setMoveDestinationFolderId(item.uuid));

  const unrepeatedFiles = await handleRepeatedUploadingFiles(filesToMove, dispatch, item.uuid);
  const unrepeatedFolders = await handleRepeatedUploadingFolders(foldersToMove, dispatch, item.uuid);
  const unrepeatedItems: DriveItemData[] = [...unrepeatedFiles, ...unrepeatedFolders] as DriveItemData[];

  if (unrepeatedItems.length === itemsToMove.length) {
    dispatch(storageActions.setMoveDestinationFolderId(null));
  }

  dispatch(
    storageThunks.moveItemsThunk({
      items: unrepeatedItems,
      destinationFolderId: item.uuid,
    }),
  );
};

export const handleFileDrop = async (
  droppedData: unknown,
  folderPath: string,
  item: BreadcrumbItemData,
  dispatch: AppDispatch,
) => {
  const { rootList, files } = await transformDraggedItems(
    (droppedData as { files: File[]; items: DataTransferItemList }).items,
    folderPath,
  );

  if (files.length) {
    await dispatch(storageThunks.uploadItemsThunk({ files, parentFolderId: item.uuid }));
  }

  if (rootList.length) {
    for (const root of rootList) {
      await dispatch(storageThunks.uploadFolderThunk({ root, currentFolderId: item.uuid }));
    }
  }
};

export const onItemDropped = (
  item: BreadcrumbItemData,
  namePath: FolderPath[],
  isSomeItemSelected: boolean,
  selectedItems: DriveItemData[],
  dispatch: AppDispatch,
) => {
  return async (draggedItem: unknown, monitor: DropTargetMonitor) => {
    const droppedType = monitor.getItemType();
    const droppedData = monitor.getItem();
    const folderPath = getFolderPath(item, namePath);

    if (droppedType === DragAndDropType.DriveItem) {
      await handleDriveItemDrop(droppedData as DriveItemData, isSomeItemSelected, selectedItems, item, dispatch);
    } else if (droppedType === NativeTypes.FILE) {
      await handleFileDrop(droppedData, folderPath, item, dispatch);
    }
  };
};

export const canItemDrop = (item) => {
  return (draggedItem: DriveItemData, monitor: DropTargetMonitor): boolean => {
    const droppedType = monitor.getItemType();
    const droppedDataParentId = draggedItem.parentId || draggedItem.folderId || -1;

    return droppedType === NativeTypes.FILE || droppedDataParentId !== item.uuid;
  };
};
