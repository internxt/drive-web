import { DropTargetMonitor, useDrop } from 'react-dnd';
import { NativeTypes } from 'react-dnd-html5-backend';
import { Menu, Transition } from '@headlessui/react';
import {
  CaretDown,
  FolderSimplePlus,
  Trash,
  PencilSimple,
  Link,
  LinkBreak,
  Copy,
  Gear,
  ArrowsOutCardinal,
  DownloadSimple,
} from 'phosphor-react';
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
import useDriveItemStoreProps from 'app/drive/components/DriveExplorer/DriveExplorerItem/hooks/useDriveStoreProps';
import {
  handleRepeatedUploadingFiles,
  handleRepeatedUploadingFolders,
} from '../../../../store/slices/storage/storage.thunks/renameItemsThunk';
import { SdkFactory } from '../../../../core/factory/sdk';
import { useTranslation } from 'react-i18next';

interface BreadcrumbsItemProps {
  item: BreadcrumbItemData;
  totalBreadcrumbsLength: number;
  isHiddenInList?: boolean;
  items: BreadcrumbItemData[];
}

const BreadcrumbsItem = (props: BreadcrumbsItemProps): JSX.Element => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const namePath = useAppSelector((state) => state.storage.namePath);
  const isSomeItemSelected = useAppSelector(storageSelectors.isSomeItemSelected);
  const selectedItems = useAppSelector((state) => state.storage.selectedItems);
  const allItems = useAppSelector((state) => state.storage.levels);
  const currentBreadcrumb = namePath[namePath.length - 1];
  const { breadcrumbDirtyName } = useDriveItemStoreProps();

  const onItemDropped = async (item, monitor: DropTargetMonitor) => {
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

      const filesToMove: DriveItemData[] = [];
      const foldersToMove = (itemsToMove as DriveItemData[])?.filter((i) => {
        if (!i.isFolder) filesToMove.push(i);
        return i.isFolder;
      });

      dispatch(storageActions.setMoveDestinationFolderId(props.item.id));
      const storageClient = SdkFactory.getInstance().createStorageClient();
      const [folderContentPromise] = storageClient.getFolderContent(props.item.id);

      const { children: foldersInDestinationFolder, files: filesInDestinationFolder } = await folderContentPromise;

      const foldersInDestinationFolderParsed = foldersInDestinationFolder.map((folder) => ({
        ...folder,
        isFolder: true,
      }));

      const unrepeatedFiles = handleRepeatedUploadingFiles(
        filesToMove,
        filesInDestinationFolder as DriveItemData[],
        dispatch,
      );
      const unrepeatedFolders = handleRepeatedUploadingFolders(
        foldersToMove,
        foldersInDestinationFolderParsed as DriveItemData[],
        dispatch,
      );
      const unrepeatedItems: DriveItemData[] = [...unrepeatedFiles, ...unrepeatedFolders] as DriveItemData[];

      if (unrepeatedItems.length === itemsToMove.length) dispatch(storageActions.setMoveDestinationFolderId(null));

      dispatch(
        storageThunks.moveItemsThunk({
          items: unrepeatedItems,
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
    dispatch(uiActions.setCurrentEditingBreadcrumbNameDirty(''));
    if (item.active) {
      item.onClick && item.onClick();
    }
  };
  const isDraggingOverClassNames = isOver && canDrop ? 'drag-over-effect' : '';

  const ItemIconComponent = iconService.getItemIcon(true);

  const findCurrentFolder = (currentBreadcrumb) => {
    const foldersList: DriveItemData[] = [];

    for (const itemsInAllitems in allItems) {
      const selectedFolder = allItems[itemsInAllitems].find((item) => item.id === currentBreadcrumb.id);
      if (selectedFolder) foldersList.push(selectedFolder as DriveItemData);
    }
    return foldersList;
  };

  const currentFolder = findCurrentFolder(currentBreadcrumb);
  const isBreadcrumbItemShared = currentFolder[0]?.shares && currentFolder[0]?.shares?.length !== 0;

  const onCreateFolderButtonClicked = () => {
    dispatch(uiActions.setIsCreateFolderDialogOpen(true));
  };

  const onDeleteButtonClicked = async () => {
    const previousBreadcrumb = props.items[props.items.length - 2];
    await moveItemsToTrash(currentFolder, t);
    onItemClicked(previousBreadcrumb);
  };

  const onDownloadButtonClicked = () => {
    dispatch(storageThunks.downloadItemsThunk(currentFolder));
  };

  const onCreateLinkButtonClicked = () => {
    const item = currentFolder[0];
    dispatch(sharedThunks.getSharedLinkThunk({ item }));
  };

  const onCopyLinkButtonClicked = () => {
    const item = currentFolder[0];
    dispatch(sharedThunks.getSharedLinkThunk({ item }));
  };

  const onDeleteLinkButtonClicked = () => {
    const item = currentFolder[0];
    dispatch(sharedThunks.deleteLinkThunk({ linkId: item?.shares?.[0]?.id as string, item }));
  };

  const onLinkSettingsButtonClicked = () => {
    const item = currentFolder[0];
    dispatch(storageActions.setItemToShare({ share: item?.shares?.[0], item }));
    dispatch(uiActions.setIsShareItemDialogOpen(true));
  };

  const onMoveButtonClicked = () => {
    dispatch(storageActions.setItemsToMove(currentFolder));
    dispatch(uiActions.setIsMoveItemsDialogOpen(true));
  };

  const onEditButtonClicked = () => {
    dispatch(uiActions.setIsEditFolderNameDialog(true));
  };

  return (
    <>
      {!props.item.active && !props.item.dialog ? (
        <Menu as="div" className="relative">
          <Menu.Button
            className="outline-none max-w-fit flex flex-1 cursor-pointer flex-row items-center truncate rounded-md p-1 px-1.5 font-medium text-gray-100 hover:bg-gray-5  
        focus-visible:bg-gray-5"
          >
            <div className="max-w-fit flex flex-1 flex-row items-center truncate">
              <span title={breadcrumbDirtyName || props.item.label} className="max-w-sm flex-1 truncate">
                {breadcrumbDirtyName || props.item.label}
              </span>
              <CaretDown weight="fill" className="ml-1 h-3 w-3" />
            </div>
          </Menu.Button>
          <Transition
            className={'absolute left-0'}
            enter="transform transition origin-top-left duration-100 ease-out"
            enterFrom="scale-95 opacity-0"
            enterTo="scale-100 opacity-100"
            leave="transform transition origin-top-left duration-100 ease-out"
            leaveFrom="scale-95 opacity-100"
            leaveTo="scale-100 opacity-0"
          >
            <Menu.Items
              className={
                'outline-none absolute mt-1 w-56 rounded-md border border-black border-opacity-8 bg-white py-1.5 text-base shadow-subtle-hard'
              }
            >
              <Menu.Item>
                {({ active }) => (
                  <div
                    onClick={onCreateFolderButtonClicked}
                    className={`${
                      active && 'bg-gray-5'
                    } flex cursor-pointer items-center py-2 px-3 text-gray-80 hover:bg-gray-5`}
                  >
                    <FolderSimplePlus size={20} />
                    <p className="ml-3">{t('actions.upload.folder')}</p>
                  </div>
                )}
              </Menu.Item>
              <div className="my-0.5 mx-3 border-t border-gray-10" />
              {!isBreadcrumbItemShared ? (
                <Menu.Item>
                  {({ active }) => (
                    <div
                      onClick={onCreateLinkButtonClicked}
                      className={`${
                        active && 'bg-gray-5'
                      } flex cursor-pointer items-center py-2 px-3 text-gray-80 hover:bg-gray-5`}
                    >
                      <Link size={20} />
                      <p className="ml-3">Get Link</p>
                    </div>
                  )}
                </Menu.Item>
              ) : (
                <>
                  <Menu.Item>
                    {({ active }) => (
                      <div
                        onClick={onCopyLinkButtonClicked}
                        className={`${
                          active && 'bg-gray-5'
                        } flex cursor-pointer items-center py-2 px-3 text-gray-80 hover:bg-gray-5`}
                      >
                        <Copy size={20} />
                        <p className="ml-3">Copy link</p>
                      </div>
                    )}
                  </Menu.Item>
                  <Menu.Item>
                    {({ active }) => (
                      <div
                        onClick={onLinkSettingsButtonClicked}
                        className={`${
                          active && 'bg-gray-5'
                        } flex cursor-pointer items-center py-2 px-3 text-gray-80 hover:bg-gray-5`}
                      >
                        <Gear size={20} />
                        <p className="ml-3">Link Settings</p>
                      </div>
                    )}
                  </Menu.Item>
                  <Menu.Item>
                    {({ active }) => (
                      <div
                        onClick={onDeleteLinkButtonClicked}
                        className={`${
                          active && 'bg-gray-5'
                        } flex cursor-pointer items-center py-2 px-3 text-gray-80 hover:bg-gray-5`}
                      >
                        <LinkBreak size={20} />
                        <p className="ml-3">Delete link</p>
                      </div>
                    )}
                  </Menu.Item>
                </>
              )}
              <Menu.Item>
                {({ active }) => (
                  <div
                    onClick={onEditButtonClicked}
                    className={`${
                      active && 'bg-gray-5'
                    } flex cursor-pointer items-center py-2 px-3 text-gray-80 hover:bg-gray-5`}
                  >
                    <PencilSimple size={20} />
                    <p className="ml-3">Rename</p>
                  </div>
                )}
              </Menu.Item>
              <Menu.Item>
                {({ active }) => (
                  <div
                    onClick={onMoveButtonClicked}
                    className={`${
                      active && 'bg-gray-5'
                    } flex cursor-pointer items-center py-2 px-3 text-gray-80 hover:bg-gray-5`}
                  >
                    <ArrowsOutCardinal size={20} />
                    <p className="ml-3">Move</p>
                  </div>
                )}
              </Menu.Item>
              <div className="my-0.5 mx-3 border-t border-gray-10" />
              <Menu.Item>
                {({ active }) => (
                  <div
                    onClick={onDownloadButtonClicked}
                    className={`${
                      active && 'bg-gray-5'
                    } flex cursor-pointer items-center py-2 px-3 text-gray-80 hover:bg-gray-5`}
                  >
                    <DownloadSimple size={20} />
                    <p className="ml-3">Download</p>
                  </div>
                )}
              </Menu.Item>
              <div className="my-0.5 mx-3 border-t border-gray-10" />
              <Menu.Item>
                {({ active }) => (
                  <div
                    onClick={onDeleteButtonClicked}
                    className={`${
                      active && 'bg-gray-5'
                    } flex cursor-pointer items-center py-2 px-3 text-gray-80 hover:bg-gray-5`}
                  >
                    <Trash size={20} />
                    <p className="ml-3">Move to Trash</p>
                  </div>
                )}
              </Menu.Item>
            </Menu.Items>
          </Transition>
        </Menu>
      ) : (
        <div
          ref={drop}
          className={`flex ${props.isHiddenInList ? 'w-full' : 'max-w-fit'} ${
            props.item.isFirstPath ? 'flex-shrink-0 p-1' : 'min-w-breadcrumb flex-1 py-1.5 px-3'
          } cursor-pointer flex-row items-center truncate font-medium ${isDraggingOverClassNames}
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
