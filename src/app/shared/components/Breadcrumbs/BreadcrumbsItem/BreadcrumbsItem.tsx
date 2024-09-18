import { transformDraggedItems } from 'app/core/services/drag-and-drop.service';
import { DragAndDropType } from 'app/core/types';
import iconService from 'app/drive/services/icon.service';
import { DriveItemData } from 'app/drive/types';
import { useAppDispatch, useAppSelector } from 'app/store/hooks';
import storageSelectors from 'app/store/slices/storage/storage.selectors';
import storageThunks from 'app/store/slices/storage/storage.thunks';
import { DropTargetMonitor, useDrop } from 'react-dnd';
import { NativeTypes } from 'react-dnd-html5-backend';
import { storageActions } from '../../../../store/slices/storage';
import {
  handleRepeatedUploadingFiles,
  handleRepeatedUploadingFolders,
} from '../../../../store/slices/storage/storage.thunks/renameItemsThunk';
import { uiActions } from '../../../../store/slices/ui';
import { BreadcrumbItemData, BreadcrumbsMenuProps } from '../types';
interface BreadcrumbsItemProps {
  item: BreadcrumbItemData;
  totalBreadcrumbsLength: number;
  isHiddenInList?: boolean;
  items: BreadcrumbItemData[];
  breadcrumbButtonDataCy?: string;
  menu?: (props: BreadcrumbsMenuProps) => JSX.Element;
}

const BreadcrumbsItem = (props: BreadcrumbsItemProps): JSX.Element => {
  const dispatch = useAppDispatch();
  const namePath = useAppSelector((state) => state.storage.namePath);
  const isSomeItemSelected = useAppSelector(storageSelectors.isSomeItemSelected);
  const selectedItems = useAppSelector((state) => state.storage.selectedItems);

  const onItemDropped = async (item, monitor: DropTargetMonitor) => {
    const droppedType = monitor.getItemType();
    const droppedData = monitor.getItem();
    const breadcrumbIndex = namePath.findIndex((level) => level.uuid === props.item.uuid);
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

      dispatch(storageActions.setMoveDestinationFolderId(props.item.uuid));

      const folderUuid = props.item.uuid;
      const unrepeatedFiles = await handleRepeatedUploadingFiles(filesToMove, dispatch, folderUuid);
      const unrepeatedFolders = await handleRepeatedUploadingFolders(foldersToMove, dispatch, folderUuid);
      const unrepeatedItems: DriveItemData[] = [...unrepeatedFiles, ...unrepeatedFolders] as DriveItemData[];

      if (unrepeatedItems.length === itemsToMove.length) dispatch(storageActions.setMoveDestinationFolderId(null));

      dispatch(
        storageThunks.moveItemsThunk({
          items: unrepeatedItems,
          destinationFolderId: props.item.uuid,
        }),
      );
    } else if (droppedType === NativeTypes.FILE) {
      transformDraggedItems((droppedData as { files: File[]; items: DataTransferItemList }).items, folderPath).then(
        async ({ rootList, files }) => {
          if (files.length) {
            // Only files
            await dispatch(storageThunks.uploadItemsThunk({ files, parentFolderId: props.item.uuid }));
          }
          if (rootList.length) {
            // Directory tree
            for (const root of rootList) {
              await dispatch(storageThunks.uploadFolderThunk({ root, currentFolderId: props.item.uuid }));
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

        return droppedType === NativeTypes.FILE || droppedDataParentId !== props.item.uuid;
      },
      drop: onItemDropped,
    }),
    [selectedItems],
  );

  const onItemClicked = (item: BreadcrumbItemData): void => {
    dispatch(uiActions.setCurrentEditingBreadcrumbNameDirty(''));
    if (item.active) {
      item.onClick && item.onClick();
    }
  };
  const isDraggingOverClassNames = isOver && canDrop ? 'drag-over-effect' : '';
  const ItemIconComponent = iconService.getItemIcon(true);

  return (
    <>
      {!props.item.active && !props.item.dialog && props.menu ? (
        <props.menu item={props.item} items={props.items} onItemClicked={onItemClicked} />
      ) : (
        <div
          ref={drop}
          className={`flex ${props.isHiddenInList ? 'w-full' : 'max-w-fit'} ${
            props.item.isFirstPath ? 'shrink-0 pr-1' : 'min-w-breadcrumb flex-1 px-1.5 py-1.5'
          } cursor-pointer flex-row items-center truncate font-medium ${isDraggingOverClassNames}
        ${
          !props.item.active || (props.item.isFirstPath && props.totalBreadcrumbsLength === 1)
            ? 'text-gray-80'
            : 'text-gray-50 hover:text-gray-80'
        }`}
          key={props.item.uuid}
          onClick={() => onItemClicked(props.item)}
          onKeyDown={() => {}}
          data-cy={props?.breadcrumbButtonDataCy}
        >
          {props.isHiddenInList && <ItemIconComponent className="h-5 w-5" />}
          {props.item.icon ? props.item.icon : null}
          {props.item.label ? (
            <span
              className={`max-w-sm flex-1 cursor-pointer truncate ${props.isHiddenInList && 'pl-3 text-base'}`}
              title={props.item.label}
            >
              {props.item.label}
            </span>
          ) : null}
        </div>
      )}
    </>
  );
};

export default BreadcrumbsItem;
