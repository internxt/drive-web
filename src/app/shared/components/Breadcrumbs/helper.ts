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

export const onItemDropped = (
  item: BreadcrumbItemData,
  namePath: FolderPath[],
  isSomeItemSelected: boolean,
  selectedItems: DriveItemData[],
  dispatch: AppDispatch,
) => {
  return async (draggedItem: any, monitor: DropTargetMonitor) => {
    const droppedType = monitor.getItemType();
    const droppedData = monitor.getItem();
    const breadcrumbIndex = namePath.findIndex((level) => level.uuid === item.uuid);
    const namePathDestinationArray = namePath.slice(0, breadcrumbIndex + 1).map((level) => level.name);
    namePathDestinationArray[0] = '';
    const folderPath = namePathDestinationArray.join('/');

    if (droppedType === DragAndDropType.DriveItem) {
      const itemsToMove = isSomeItemSelected
        ? [...selectedItems, droppedData as DriveItemData].filter(
            (a, index, self) => index === self.findIndex((b) => a.id === b.id && a.isFolder === b.isFolder),
          )
        : [droppedData];

      const filesToMove: DriveItemData[] = [];
      const foldersToMove = (itemsToMove as DriveItemData[])?.filter((i) => {
        if (!i.isFolder) filesToMove.push(i);
        return i.isFolder;
      });

      dispatch(storageActions.setMoveDestinationFolderId(item.uuid));

      const unrepeatedFiles = await handleRepeatedUploadingFiles(filesToMove, dispatch, item.uuid);
      const unrepeatedFolders = await handleRepeatedUploadingFolders(foldersToMove, dispatch, item.uuid);
      const unrepeatedItems: DriveItemData[] = [...unrepeatedFiles, ...unrepeatedFolders] as DriveItemData[];

      if (unrepeatedItems.length === itemsToMove.length) dispatch(storageActions.setMoveDestinationFolderId(null));

      dispatch(
        storageThunks.moveItemsThunk({
          items: unrepeatedItems,
          destinationFolderId: item.uuid,
        }),
      );
    } else if (droppedType === NativeTypes.FILE) {
      transformDraggedItems((droppedData as { files: File[]; items: DataTransferItemList }).items, folderPath).then(
        async ({ rootList, files }) => {
          if (files.length) {
            // Only files
            await dispatch(storageThunks.uploadItemsThunk({ files, parentFolderId: item.uuid }));
          }
          if (rootList.length) {
            // Directory tree
            for (const root of rootList) {
              await dispatch(storageThunks.uploadFolderThunk({ root, currentFolderId: item.uuid }));
            }
          }
        },
      );
    }
  };
};

export const canItemDrop = (item) => {
  return (draggedItem: any, monitor: any): boolean => {
    const droppedType = monitor.getItemType();
    const droppedDataParentId = draggedItem.parentId || draggedItem.folderId || -1;

    return droppedType === NativeTypes.FILE || droppedDataParentId !== item.uuid;
  };
};
