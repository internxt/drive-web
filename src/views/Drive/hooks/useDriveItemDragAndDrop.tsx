import { ConnectDragSource, ConnectDropTarget, useDrag, useDrop } from 'react-dnd';
import { NativeTypes } from 'react-dnd-html5-backend';
import { DragAndDropType } from 'app/core/types';
import { useAppDispatch, useAppSelector } from 'app/store/hooks';
import storageSelectors from 'app/store/slices/storage/storage.selectors';
import storageThunks from 'app/store/slices/storage/storage.thunks';
import { getCollisionGroups } from 'app/store/slices/storage/storage.thunks/renameItemsThunk';
import { uiActions } from 'app/store/slices/ui';
import { DriveItemData } from 'app/drive/types';
import { notifyUploadFailed } from 'app/upload/notifyUploadFailed';
import { handleFileDrop } from 'components/BreadcrumbsHelper';
import { useUploadItems } from 'app/upload/useUploadItems';

interface DragSourceCollectorProps {
  isDraggingThisItem: boolean;
}

interface DriveItemDrag {
  isDraggingThisItem: boolean;
  connectDragSource: ConnectDragSource;
}

interface DropTargetCollectorProps {
  isDraggingOverThisItem: boolean;
  canDrop: boolean;
}

interface DriveItemDrop {
  isDraggingOverThisItem: boolean;
  canDrop: boolean;
  connectDropTarget: ConnectDropTarget;
}

export const useDriveItemDrag = (item: DriveItemData): DriveItemDrag => {
  const [{ isDraggingThisItem }, connectDragSource] = useDrag<DriveItemData, unknown, DragSourceCollectorProps>(() => ({
    type: DragAndDropType.DriveItem,
    collect: (monitor) => ({
      isDraggingThisItem: monitor.isDragging(),
    }),
    item,
  }));

  return { isDraggingThisItem, connectDragSource };
};

const handleDriveItemDrop = async (
  droppedData: DriveItemData,
  item: DriveItemData,
  isSomeItemSelected: boolean,
  selectedItems: DriveItemData[],
  dispatch: ReturnType<typeof useAppDispatch>,
) => {
  const itemsToMove = isSomeItemSelected
    ? [...selectedItems, droppedData].filter(
        (a, index, self) => index === self.findIndex((b) => a.id === b.id && a.isFolder === b.isFolder),
      )
    : [droppedData];

  const groups = await getCollisionGroups([{ destinationUuid: item.uuid, items: itemsToMove }]);
  const [group] = groups;

  if (group.duplicatedItems.length > 0) {
    dispatch(uiActions.setIsNameCollisionDialogOpen({ open: true, info: { groups, operation: 'move' } }));
  }

  if (group.unrepeatedItems.length > 0) {
    dispatch(storageThunks.moveItemsThunk({ items: group.unrepeatedItems, destinationFolderId: item.uuid }));
  }
};

export const useDriveItemDrop = (item: DriveItemData): DriveItemDrop => {
  const dispatch = useAppDispatch();
  const { uploadItems } = useUploadItems();
  const isSomeItemSelected = useAppSelector(storageSelectors.isSomeItemSelected);
  const { selectedItems } = useAppSelector((state) => state.storage);

  const [{ isDraggingOverThisItem, canDrop }, connectDropTarget] = useDrop<
    DriveItemData | DriveItemData[],
    unknown,
    DropTargetCollectorProps
  >(
    () => ({
      accept: item.isFolder ? [NativeTypes.FILE, DragAndDropType.DriveItem] : [],
      collect: (monitor) => ({
        isDraggingOverThisItem: monitor.isOver() && item.isFolder,
        canDrop: monitor.canDrop(),
      }),
      canDrop: () => true,
      drop: async (_, monitor) => {
        const droppedType = monitor.getItemType();

        if (!item.isFolder) {
          return;
        }

        if (droppedType === DragAndDropType.DriveItem) {
          const droppedData = monitor.getItem<DriveItemData>();
          await handleDriveItemDrop(droppedData, item, isSomeItemSelected, selectedItems, dispatch);
        } else if (droppedType === NativeTypes.FILE) {
          const { items: droppedItems } = monitor.getItem<{ items: DataTransferItemList }>();
          await handleFileDrop(droppedItems, item.uuid, uploadItems).catch(notifyUploadFailed);
        }
      },
    }),
    [selectedItems, uploadItems],
  );

  return {
    isDraggingOverThisItem,
    canDrop,
    connectDropTarget,
  };
};
