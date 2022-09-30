import { DropTargetMonitor, useDrop } from 'react-dnd';
import { NativeTypes } from 'react-dnd-html5-backend';
import { useAppDispatch, useAppSelector } from 'app/store/hooks';
import storageSelectors from 'app/store/slices/storage/storage.selectors';
import storageThunks from 'app/store/slices/storage/storage.thunks';
import { BreadcrumbItemData } from '../Breadcrumbs';
import { transformDraggedItems } from 'app/core/services/drag-and-drop.service';
import { DragAndDropType } from 'app/core/types';
import { DriveItemData } from 'app/drive/types';
import iconService from 'app/drive/services/icon.service';

interface BreadcrumbsItemProps {
  item: BreadcrumbItemData;
  totalBreadcrumbsLength: number;
  isHiddenInList?: boolean;
}

const BreadcrumbsItem = (props: BreadcrumbsItemProps): JSX.Element => {
  const dispatch = useAppDispatch();
  const namePath = useAppSelector((state) => state.storage.namePath);
  const isSomeItemSelected = useAppSelector(storageSelectors.isSomeItemSelected);
  const selectedItems = useAppSelector((state) => state.storage.selectedItems);
  const onItemDropped = (item, monitor: DropTargetMonitor) => {
    const droppedType = monitor.getItemType();
    const droppedData = monitor.getItem();
    const breadcrumbIndex = namePath.findIndex((level) => level.id === props.item.id);
    const namePathDestinationArray = namePath.slice(0, breadcrumbIndex + 1).map((level) => level.name);
    namePathDestinationArray[0] = '';
    const folderPath = namePathDestinationArray.join('/');

    if (droppedType === DragAndDropType.DriveItem) {
      const itemsToMove = isSomeItemSelected
        ? [...selectedItems, droppedData as DriveItemData].filter(
          (a, index, self) => index === self.findIndex((b) => a.id === b.id && a.isFolder === b.isFolder),
        )
        : [droppedData];

      dispatch(
        storageThunks.moveItemsThunk({
          items: itemsToMove as DriveItemData[],
          destinationFolderId: props.item.id,
        }),
      );
    } else if (droppedType === NativeTypes.FILE) {
      transformDraggedItems((droppedData as { files: File[]; items: DataTransferItemList }).items, folderPath).then(
        async ({ rootList, files }) => {
          if (files.length) {
            // Only files
            await dispatch(storageThunks.uploadItemsThunk({ files, parentFolderId: props.item.id }));
          }
          if (rootList.length) {
            // Directory tree
            for (const root of rootList) {
              await dispatch(storageThunks.uploadFolderThunk({ root, currentFolderId: props.item.id }));
            }
          }
        },
      );
    }
  };
  const [{ isOver, canDrop }, drop] = useDrop(
    () => ({
      accept: [NativeTypes.FILE, DragAndDropType.DriveItem],
      collect: (monitor) => ({
        isOver: monitor.isOver(),
        canDrop: monitor.canDrop(),
      }),
      canDrop: (item, monitor): boolean => {
        const droppedType = monitor.getItemType();
        const droppedDataParentId = item.parentId || item.folderId || -1;

        return droppedType === NativeTypes.FILE || droppedDataParentId !== props.item.id;
      },
      drop: onItemDropped,
    }),
    [selectedItems],
  );
  const onItemClicked = (item: BreadcrumbItemData): void => {
    if (item.active) {
      item.onClick && item.onClick();
    }
  };
  const isDraggingOverClassNames = isOver && canDrop ? 'drag-over-effect' : '';

  const ItemIconComponent = iconService.getItemIcon(true);

  return (
    <div
      ref={drop}
      className={`p-1 flex items-center cursor-pointer ${isDraggingOverClassNames} ${props.item.active ? 'color-gray-80' : 'color-gray-50'}`}
      style={{ maxWidth: props.isHiddenInList || props.item.isFirstPath ? '100%' : props.totalBreadcrumbsLength === 3 ? '25%' : '50%' }}
      key={props.item.id}
      onClick={() => onItemClicked(props.item)}
    >
      {props.isHiddenInList && <div style={{ width: '10%' }}><ItemIconComponent className="h-full w-full" /></div>}
      {props.item.icon ? props.item.icon : null}
      {props.item.label ? <span style={{ width: props.isHiddenInList ? '90%' : '100%' }}
        className={`label overflow-hidden overflow-ellipsis whitespace-nowrap ${props.isHiddenInList && 'text-base pl-3'}`}
        title={props.item.label}>{props.item.label}</span> : null}
    </div>
  );
};

export default BreadcrumbsItem;
