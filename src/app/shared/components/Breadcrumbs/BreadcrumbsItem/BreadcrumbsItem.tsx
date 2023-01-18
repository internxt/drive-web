import { useState } from 'react';
import { DropTargetMonitor, useDrop } from 'react-dnd';
import { NativeTypes } from 'react-dnd-html5-backend';
import { Menu, Transition } from '@headlessui/react';
import {
  CaretDown,
  FolderSimplePlus,
  Trash,
  PencilSimple,
  Link,
  ArrowsOutCardinal,
  Users,
  DownloadSimple,
} from 'phosphor-react';
import { DriveFolderMetadataPayload } from 'app/drive/types/index';
import { useAppDispatch, useAppSelector } from 'app/store/hooks';
import storageSelectors from 'app/store/slices/storage/storage.selectors';
import storageThunks from 'app/store/slices/storage/storage.thunks';
import { BreadcrumbItemData } from '../Breadcrumbs';
import { transformDraggedItems } from 'app/core/services/drag-and-drop.service';
import { DragAndDropType } from 'app/core/types';
import { DriveItemData } from 'app/drive/types';
import iconService from 'app/drive/services/icon.service';
import { sharedThunks } from 'app/store/slices/sharedLinks';
import { storageActions } from '../../../../store/slices/storage';
import moveItemsToTrash from '../../../../../use_cases/trash/move-items-to-trash';
import { uiActions } from '../../../../store/slices/ui';
import i18n from '../../../../i18n/services/i18n.service';
interface BreadcrumbsItemProps {
  item: BreadcrumbItemData;
  totalBreadcrumbsLength: number;
  isHiddenInList?: boolean;
  items: BreadcrumbItemData[];
}

const BreadcrumbsItem = (props: BreadcrumbsItemProps): JSX.Element => {
  const [isEditingName, setIsEditingName] = useState(false);
  const [dirtyName, setdirtyName] = useState(props.item.label);
  const dispatch = useAppDispatch();
  const namePath = useAppSelector((state) => state.storage.namePath);
  const isSomeItemSelected = useAppSelector(storageSelectors.isSomeItemSelected);
  const selectedItems = useAppSelector((state) => state.storage.selectedItems);
  const allItems = useAppSelector((state) => state.storage.levels);
  const currentBreadcrumb = namePath[namePath.length - 1];

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

  const findCurrentFolder = (currentBreadcrumb) => {
    const foldersList: DriveItemData[] = [];

    for (const itemsInAllitems in allItems) {
      const selectedFolder = allItems[itemsInAllitems].find(
        (item) => item.id === currentBreadcrumb.id && item.name === currentBreadcrumb.name,
      );
      if (selectedFolder) foldersList.push(selectedFolder as DriveItemData);
    }
    return foldersList;
  };

  const currentFolder = findCurrentFolder(currentBreadcrumb);
  const isBreadcrumbItemShared = currentFolder[0]?.shares?.length !== 0;

  const onCreateFolderButtonClicked = () => {
    dispatch(uiActions.setIsCreateFolderDialogOpen(true));
  };

  const onDeleteButtonClicked = async () => {
    const previousBreadcrumb = props.items[props.items.length - 2];
    await moveItemsToTrash(currentFolder);
    onItemClicked(previousBreadcrumb);
  };

  const onDownloadButtonClicked = () => {
    dispatch(storageThunks.downloadItemsThunk(currentFolder));
  };

  const onShareButtonClicked = () => {
    const item = currentFolder[0];
    dispatch(sharedThunks.getSharedLinkThunk({ item }));
  };

  const onShareCopyButtonClicked = () => {
    const item = currentFolder[0];
    dispatch(sharedThunks.getSharedLinkThunk({ item }));
  };

  const onMoveButtonClicked = () => {
    dispatch(storageActions.setItemsToMove(currentFolder));
    dispatch(uiActions.setIsMoveItemsDialogOpen(true));
  };

  const onEditButtonClicked = () => {
    setIsEditingName(true);
  };

  const onNameChanged = (e) => {
    setdirtyName(e.target.value);
  };

  const onNameBlurred = () => {
    setIsEditingName(false);
  };

  const confirmNameChange = () => {
    const item = currentFolder[0];
    const metadata: DriveFolderMetadataPayload = { itemName: dirtyName };
    if (item.name !== dirtyName) {
      dispatch(storageThunks.updateItemMetadataThunk({ item, metadata }));
    }
    setIsEditingName(false);
  };

  const onNameEnterKeyDown = (e) => {
    if (e.key === 'Enter') {
      confirmNameChange();
    } else if (e.key === 'Escape') {
      onNameBlurred();
    }
  };

  return (
    <>
      {!props.item.active && !props.item.dialog ? (
        <div className="relative flex items-center">
          <Menu>
            {isEditingName ? (
              <input
                className="dense no-ring rect select-text border border-white"
                onClick={(e) => e.stopPropagation()}
                onDoubleClick={(e) => e.stopPropagation()}
                type="text"
                value={dirtyName}
                placeholder={dirtyName}
                onChange={onNameChanged}
                onBlur={onNameBlurred}
                onKeyDown={onNameEnterKeyDown}
                autoFocus
                name="fileName"
              />
            ) : (
              <Menu.Button
                className={'flex cursor-pointer items-center rounded-md p-1 hover:bg-gray-5 active:bg-gray-5'}
              >
                <div className="flex items-center">
                  {dirtyName}
                  <CaretDown weight="bold" className="ml-1 h-3 w-3" color="#3A3A3B" />
                </div>
              </Menu.Button>
            )}
            <Transition
              className={'absolute left-0'}
              enter="transform transition duration-50 ease-out"
              enterFrom="scale-98 opacity-0"
              enterTo="scale-100 opacity-100"
              leave="transform transition duration-50 ease-out"
              leaveFrom="scale-98 opacity-100"
              leaveTo="scale-100 opacity-0"
            >
              <Menu.Items
                className={
                  'absolute mt-6 w-56 rounded-md border border-black border-opacity-8 bg-white py-1.5 drop-shadow'
                }
              >
                <Menu.Item>
                  <div
                    onClick={onCreateFolderButtonClicked}
                    className="flex cursor-pointer items-center py-2 px-3 text-gray-80 hover:bg-gray-5 active:bg-gray-10"
                  >
                    <FolderSimplePlus size={20} />
                    <p className="ml-3">{i18n.get('actions.upload.folder')}</p>
                  </div>
                </Menu.Item>
                <div className="my-0.5 mx-3 border-t border-gray-10" />
                {!isBreadcrumbItemShared ? (
                  <Menu.Item>
                    <div
                      onClick={onShareButtonClicked}
                      className="flex cursor-pointer items-center py-2 px-3 text-gray-80 hover:bg-gray-5 active:bg-gray-10"
                    >
                      <Users size={20} />
                      <p className="ml-3">Share</p>
                    </div>
                  </Menu.Item>
                ) : (
                  <Menu.Item>
                    <div
                      onClick={onShareCopyButtonClicked}
                      className="flex cursor-pointer items-center py-2 px-3 text-gray-80 hover:bg-gray-5 active:bg-gray-10"
                    >
                      <Link size={20} />
                      <p className="ml-3">Get Link</p>
                    </div>
                  </Menu.Item>
                )}
                <Menu.Item>
                  <div
                    onClick={onEditButtonClicked}
                    className="flex cursor-pointer items-center py-2 px-3 text-gray-80 hover:bg-gray-5 active:bg-gray-10"
                  >
                    <PencilSimple size={20} />
                    <p className="ml-3">Rename</p>
                  </div>
                </Menu.Item>
                <Menu.Item>
                  <div
                    onClick={onMoveButtonClicked}
                    className="flex cursor-pointer items-center py-2 px-3 text-gray-80 hover:bg-gray-5 active:bg-gray-10"
                  >
                    <ArrowsOutCardinal size={20} />
                    <p className="ml-3">Move</p>
                  </div>
                </Menu.Item>
                <div className="my-0.5 mx-3 border-t border-gray-10" />
                <Menu.Item>
                  <div
                    onClick={onDownloadButtonClicked}
                    className="flex cursor-pointer items-center py-2 px-3 text-gray-80 hover:bg-gray-5 active:bg-gray-10"
                  >
                    <DownloadSimple size={20} />
                    <p className="ml-3">Download</p>
                  </div>
                </Menu.Item>
                <div className="my-0.5 mx-3 border-t border-gray-10" />
                <Menu.Item>
                  <div
                    onClick={onDeleteButtonClicked}
                    className="flex cursor-pointer items-center py-2 px-3 text-gray-80 hover:bg-gray-5 active:bg-gray-10"
                  >
                    <Trash size={20} />
                    <p className="ml-3">Move to Trash</p>
                  </div>
                </Menu.Item>
              </Menu.Items>
            </Transition>
          </Menu>
        </div>
      ) : (
        <div
          ref={drop}
          className={`max-w-fit flex ${
            props.item.isFirstPath ?? 'flex-1'
          } cursor-pointer flex-row items-center truncate p-1 font-medium ${isDraggingOverClassNames}
        ${
          !props.item.active || (props.item.isFirstPath && props.totalBreadcrumbsLength === 1)
            ? 'text-gray-80'
            : 'text-gray-50 hover:text-gray-80'
        }`}
          key={props.item.id}
          onClick={() => onItemClicked(props.item)}
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
