import { DropTargetMonitor, useDrop } from 'react-dnd';
import { NativeTypes } from 'react-dnd-html5-backend';
import { DragAndDropType } from '../../../models/enums';
import { DriveItemData } from '../../../models/interfaces';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import storageSelectors from '../../../store/slices/storage/storage.selectors';
import storageThunks from '../../../store/slices/storage/storage.thunks';
import { BreadcrumbItemData } from '../Breadcrumbs';
import { transformDraggedItems } from '../../../services/drag-and-drop.service';

interface BreadcrumbsItemProps {
  item: BreadcrumbItemData;
}

const BreadcrumbsItem = (props: BreadcrumbsItemProps): JSX.Element => {
  const dispatch = useAppDispatch();
  const namePath = useAppSelector((state) => state.storage.namePath);
  const isSomeItemSelected = useAppSelector(storageSelectors.isSomeItemSelected);
  const selectedItems = useAppSelector((state) => state.storage.selectedItems);
  const onItemDropped = (item, monitor: DropTargetMonitor) => {
    const droppedType = monitor.getItemType();
    const droppedData = monitor.getItem();

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
      const breadcrumbIndex = namePath.findIndex((level) => level.id === props.item.id);
      const namePathDestinationArray = namePath.slice(0, breadcrumbIndex + 1).map((level) => level.name);

      namePathDestinationArray[0] = '';

      const folderPath = namePathDestinationArray.join('/');

      transformDraggedItems((droppedData as any).items, folderPath).then(async ({ rootList, files }) => {
        if (files.length) {
          // Only files
          await dispatch(storageThunks.uploadItemsThunk({ files, parentFolderId: props.item.id, folderPath }));
        }
        if (rootList.length) {
          // Directory tree
          for (const root of rootList) {
            await dispatch(storageThunks.createFolderTreeStructureThunk({ root, currentFolderId: props.item.id }));
          }
        }
      });
    }
  };
  const [{ isOver, canDrop }, drop] = useDrop(() => ({
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
  }));
  const onItemClicked = (item: BreadcrumbItemData): void => {
    if (item.active) {
      item.onClick && item.onClick();
    }
  };
  const isDraggingOverClassNames = isOver && canDrop ? 'drag-over-effect' : '';

  return (
    <li
      ref={drop}
      className={`p-1 flex items-center ${isDraggingOverClassNames} ${props.item.active ? 'active' : ''}`}
      key={props.item.id}
      onClick={() => onItemClicked(props.item)}
    >
      {props.item.icon ? props.item.icon : null}
      {props.item.label ? <span className="label">{props.item.label}</span> : null}
    </li>
  );
};

export default BreadcrumbsItem;
