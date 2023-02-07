import { createRef, ReactNode, forwardRef, useState, RefObject, useEffect } from 'react';
import { connect } from 'react-redux';
import {
  Trash,
  DownloadSimple,
  UploadSimple,
  FolderSimplePlus,
  Rows,
  SquaresFour,
  FileArrowUp,
  Plus,
  ClockCounterClockwise,
  Link,
  PencilSimple,
  CaretDown,
} from 'phosphor-react';
import { NativeTypes } from 'react-dnd-html5-backend';
import { ConnectDropTarget, DropTarget, DropTargetCollector, DropTargetSpec } from 'react-dnd';

import DriveExplorerList from './DriveExplorerList/DriveExplorerList';
import DriveExplorerGrid from './DriveExplorerGrid/DriveExplorerGrid';
import folderEmptyImage from 'assets/icons/light/folder-open.svg';
import Empty from '../../../shared/components/Empty/Empty';
import { transformDraggedItems } from 'app/core/services/drag-and-drop.service';
import { StorageFilters } from 'app/store/slices/storage/storage.model';
import { AppDispatch, RootState } from 'app/store';
import { Workspace } from 'app/core/types';

import './DriveExplorer.scss';
import storageThunks from '../../../store/slices/storage/storage.thunks';
import deviceService from '../../../core/services/device.service';
import { storageActions } from '../../../store/slices/storage';
import { uiActions } from '../../../store/slices/ui';
import CreateFolderDialog from '../../../drive/components/CreateFolderDialog/CreateFolderDialog';
import DeleteItemsDialog from '../../../drive/components/DeleteItemsDialog/DeleteItemsDialog';
import ClearTrashDialog from '../../../drive/components/ClearTrashDialog/ClearTrashDialog';
import UploadItemsFailsDialog from '../UploadItemsFailsDialog/UploadItemsFailsDialog';
import EditFolderNameDialog from '../EditFolderNameDialog/EditFolderNameDialog';
import BaseButton from '../../../shared/components/forms/BaseButton';
import storageSelectors from '../../../store/slices/storage/storage.selectors';
import { planSelectors } from '../../../store/slices/plan';
import { DriveItemData, FileViewMode, FolderPath } from '../../types';
import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import iconService from '../../services/icon.service';
import moveItemsToTrash from '../../../../use_cases/trash/move-items-to-trash';
import MoveItemsDialog from '../MoveItemsDialog/MoveItemsDialog';
import { IRoot } from 'app/store/slices/storage/storage.thunks/uploadFolderThunk';
import {
  transformInputFilesToJSON,
  transformJsonFilesToItems,
} from 'app/drive/services/folder.service/uploadFolderInput.service';
import Dropdown from 'app/shared/components/Dropdown';
import { useAppDispatch } from 'app/store/hooks';
import useDriveItemStoreProps from './DriveExplorerItem/hooks/useDriveStoreProps';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';
import {
  handleRepeatedUploadingFiles,
  handleRepeatedUploadingFolders,
} from '../../../store/slices/storage/storage.thunks/renameItemsThunk';
import NameCollisionContainer from '../NameCollisionDialog/NameCollisionContainer';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import { TFunction } from 'i18next';

const PAGINATION_LIMIT = 60;

interface DriveExplorerProps {
  title: JSX.Element | string;
  titleClassName?: string;
  isLoading: boolean;
  items: DriveItemData[];
  onItemsDeleted?: () => void;
  onItemsMoved?: () => void;
  onFileUploaded?: () => void;
  onFolderUploaded?: () => void;
  onFolderCreated?: () => void;
  onDragAndDropEnd?: () => void;
  user: UserSettings | undefined;
  currentFolderId: number;
  selectedItems: DriveItemData[];
  storageFilters: StorageFilters;
  isAuthenticated: boolean;
  isCreateFolderDialogOpen: boolean;
  isMoveItemsDialogOpen: boolean;
  isDeleteItemsDialogOpen: boolean;
  isClearTrashDialogOpen: boolean;
  viewMode: FileViewMode;
  namePath: FolderPath[];
  dispatch: AppDispatch;
  workspace: Workspace;
  planLimit: number;
  planUsage: number;
  isOver: boolean;
  connectDropTarget: ConnectDropTarget;
}

const DriveExplorer = (props: DriveExplorerProps): JSX.Element => {
  const {
    selectedItems,
    isLoading,
    viewMode,
    title,
    titleClassName,
    items,
    onItemsDeleted,
    onFolderCreated,
    isOver,
    connectDropTarget,
    storageFilters,
    currentFolderId,
    onFileUploaded,
    onItemsMoved,
  } = props;
  const dispatch = useAppDispatch();
  const { translate } = useTranslationContext();
  const [fileInputRef] = useState<RefObject<HTMLInputElement>>(createRef());
  const [fileInputKey, setFileInputKey] = useState<number>(Date.now());
  const [folderInputRef] = useState<RefObject<HTMLInputElement>>(createRef());
  const [folderInputKey, setFolderInputKey] = useState<number>(Date.now());
  const [fakePaginationLimit, setFakePaginationLimit] = useState<number>(PAGINATION_LIMIT);
  const [hasMoreItems, setHasMoreItems] = useState<boolean>(true);

  const hasItems = items.length > 0;
  const hasFilters = storageFilters.text.length > 0;
  const hasAnyItemSelected = selectedItems.length > 0;
  const isSelectedItemShared = selectedItems[0]?.shares?.length !== 0;

  useEffect(() => {
    deviceService.redirectForMobile();
  }, []);

  const onUploadFileButtonClicked = (): void => {
    fileInputRef.current?.click();
  };

  const onUploadFolderButtonClicked = (): void => {
    folderInputRef.current?.click();
  };

  const onDownloadButtonClicked = (): void => {
    dispatch(storageThunks.downloadItemsThunk(selectedItems));
  };

  const onUploadFileInputChanged = (e) => {
    const files = e.target.files;

    if (files.length < 1000) {
      const unrepeatedUploadedFiles = handleRepeatedUploadingFiles(Array.from(files), items, dispatch) as File[];
      dispatch(
        storageThunks.uploadItemsThunk({
          files: Array.from(unrepeatedUploadedFiles),
          parentFolderId: currentFolderId,
        }),
      ).then(() => onFileUploaded && onFileUploaded());
      setFileInputKey(Date.now());
    } else {
      dispatch(uiActions.setIsUploadItemsFailsDialogOpen(true));
      notificationsService.show({
        text: 'The maximum is 1000 files per upload.',
        type: ToastType.Warning,
      });
    }
  };

  const onUploadFolderInputChanged = async (e) => {
    const files = e?.target?.files as File[];

    const filesJson = transformInputFilesToJSON(files);
    const { rootList, rootFiles } = transformJsonFilesToItems(filesJson, currentFolderId);

    await uploadItems(props, rootList, rootFiles);
    setFolderInputKey(Date.now());
  };

  const onViewModeButtonClicked = (): void => {
    const setViewMode: FileViewMode = viewMode === FileViewMode.List ? FileViewMode.Grid : FileViewMode.List;

    dispatch(storageActions.setViewMode(setViewMode));
  };

  const onCreateFolderButtonClicked = () => {
    dispatch(uiActions.setIsCreateFolderDialogOpen(true));
  };

  const onBulkDeleteButtonClicked = () => {
    moveItemsToTrash(selectedItems, translate as TFunction);
  };

  const onDeletePermanentlyButtonClicked = () => {
    if (selectedItems.length > 0) {
      dispatch(storageActions.setItemsToDelete(selectedItems));
      dispatch(uiActions.setIsDeleteItemsDialogOpen(true));
    } else {
      dispatch(uiActions.setIsClearTrashDialogOpen(true));
    }
  };

  const onRecoverButtonClicked = () => {
    //Recover selected (you can select all) files or folders from Trash
    dispatch(storageActions.setItemsToMove(selectedItems));
    dispatch(uiActions.setIsMoveItemsDialogOpen(true));
  };

  const onSelectedOneItemShare = (e) => {
    e.stopPropagation();
    if (selectedItems.length === 1) {
      dispatch(
        storageActions.setItemToShare({
          share: selectedItems[0].shares?.[0],
          item: selectedItems[0],
        }),
      );
      dispatch(uiActions.setIsShareItemDialogOpen(true));
    }
  };

  const { dirtyName } = useDriveItemStoreProps();

  // Fake backend pagination - change when pagination in backend has been implemented
  const getMoreItems = () => {
    const existsMoreItems = items.length > fakePaginationLimit;

    setHasMoreItems(existsMoreItems);
    setTimeout(() => {
      if (existsMoreItems) setFakePaginationLimit(fakePaginationLimit + PAGINATION_LIMIT);
    }, 1000);
  };

  const getLimitedItems = () => items.slice(0, fakePaginationLimit);

  const onSelectedOneItemRename = (e) => {
    e.stopPropagation();
    if (selectedItems.length === 1) {
      if (!dirtyName || dirtyName === null || dirtyName.trim() === '') {
        dispatch(uiActions.setCurrentEditingNameDirty(selectedItems[0].name));
      } else {
        dispatch(uiActions.setCurrentEditingNameDirty(dirtyName));
      }
      dispatch(uiActions.setCurrentEditingNameDriveItem(selectedItems[0]));
    }
  };

  const viewModesIcons = {
    [FileViewMode.List]: <SquaresFour className="h-6 w-6" />,
    [FileViewMode.Grid]: <Rows className="h-6 w-6" />,
  };
  const viewModes = {
    [FileViewMode.List]: DriveExplorerList,
    [FileViewMode.Grid]: DriveExplorerGrid,
  };

  const isRecents = title === translate('views.recents.head');
  const isTrash = title === translate('trash.trash');
  const ViewModeComponent = viewModes[isTrash ? FileViewMode.List : viewMode];
  const itemsList = getLimitedItems();

  const FileIcon = iconService.getItemIcon(false);
  const filesEmptyImage = (
    <div className="relative h-32 w-32">
      <FileIcon className="absolute -top-2.5 left-7 rotate-10 transform drop-shadow-soft filter" />
      <FileIcon className="absolute top-0.5 -left-7 rotate-10- transform drop-shadow-soft filter" />
    </div>
  );

  const separatorV = <div className="mx-3 my-2 border-r border-gray-10" />;
  const separatorH = <div className="border-translate my-0.5 mx-3 border-gray-10" />;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const MenuItem = forwardRef(({ children, onClick }: { children: ReactNode; onClick: () => void }, ref) => {
    return (
      <div
        className="flex cursor-pointer items-center py-2 px-3 text-gray-80 hover:bg-gray-5 active:bg-gray-10"
        onClick={onClick}
      >
        {children}
      </div>
    );
  });

  const EmptyTrash = () => (
    <div className="flex h-36 w-36 items-center justify-center rounded-full bg-gray-5">
      <Trash size={80} weight="thin" />
    </div>
  );

  const driveExplorer = (
    <div className="flex h-full flex-grow flex-col px-8" data-test="drag-and-drop-area">
      <DeleteItemsDialog onItemsDeleted={onItemsDeleted} />
      <CreateFolderDialog onFolderCreated={onFolderCreated} currentFolderId={currentFolderId} />
      <NameCollisionContainer />
      <MoveItemsDialog items={items} onItemsMoved={onItemsMoved} isTrash={isTrash} />
      <ClearTrashDialog onItemsDeleted={onItemsDeleted} />
      <EditFolderNameDialog />
      <UploadItemsFailsDialog />

      <div className="z-0 flex h-full w-full max-w-full flex-grow">
        <div className="flex w-1 flex-grow flex-col pt-6">
          <div className="z-10 flex max-w-full justify-between pb-4">
            <div className={`mr-20 flex w-full min-w-0 flex-1 flex-row items-center text-lg ${titleClassName || ''}`}>
              {title}
            </div>

            {!isTrash && (
              <div className="flex flex-shrink-0 flex-row">
                <Dropdown
                  classButton={
                    'primary base-button flex items-center justify-center rounded-lg py-1.5 text-base transition-all duration-75 ease-in-out'
                  }
                  openDirection={'right'}
                  classMenuItems={'right-0 w-max rounded-md border border-black border-opacity-8 bg-white py-1.5 mt-1'}
                  menuItems={[
                    <MenuItem onClick={onCreateFolderButtonClicked}>
                      <FolderSimplePlus size={20} />
                      <p className="ml-3">{translate('actions.upload.folder')}</p>
                    </MenuItem>,
                    separatorH,
                    <MenuItem onClick={onUploadFileButtonClicked}>
                      <FileArrowUp size={20} />
                      <p className="ml-3">{translate('actions.upload.uploadFiles')}</p>
                    </MenuItem>,
                    <MenuItem onClick={onUploadFolderButtonClicked}>
                      <UploadSimple size={20} />
                      <p className="ml-3">{translate('actions.upload.uploadFolder')}</p>
                    </MenuItem>,
                  ]}
                >
                  <div className="flex flex-row items-center space-x-2.5">
                    <span className="font-medium">{translate('actions.upload.new')}</span>
                    <div className="flex items-center space-x-0.5">
                      <Plus weight="bold" className="h-4 w-4" />
                      <CaretDown weight="fill" className="h-3 w-3" />
                    </div>
                  </div>
                </Dropdown>
                {hasAnyItemSelected && (
                  <>
                    {separatorV}
                    <BaseButton className="tertiary square w-8" onClick={onDownloadButtonClicked}>
                      <DownloadSimple className="h-6 w-6" />
                    </BaseButton>
                    {selectedItems.length === 1 && (
                      <>
                        {isSelectedItemShared && (
                          <BaseButton className="tertiary square w-8" onClick={onSelectedOneItemShare}>
                            <Link className="h-6 w-6" />
                          </BaseButton>
                        )}
                        <BaseButton className="tertiary square w-8" onClick={onSelectedOneItemRename}>
                          <PencilSimple className="h-6 w-6" />
                        </BaseButton>
                      </>
                    )}
                    <BaseButton className="tertiary square w-8" onClick={onBulkDeleteButtonClicked}>
                      <Trash className="h-6 w-6" />
                    </BaseButton>
                  </>
                )}
                {separatorV}
                <BaseButton className="tertiary square w-8" onClick={onViewModeButtonClicked}>
                  {viewModesIcons[viewMode]}
                </BaseButton>
              </div>
            )}
            {isTrash && hasAnyItemSelected && (
              <BaseButton className="tertiary square w-8" onClick={onRecoverButtonClicked}>
                <ClockCounterClockwise className="h-6 w-6" />
              </BaseButton>
            )}
            {isTrash && (
              <BaseButton
                className="tertiary square w-8"
                disabled={!hasItems}
                onClick={onDeletePermanentlyButtonClicked}
              >
                <Trash className="h-5 w-5" />
              </BaseButton>
            )}
          </div>

          <div className="z-0 mb-5 flex h-full flex-grow flex-col justify-between overflow-y-hidden">
            {hasItems && (
              <div className="flex flex-grow flex-col justify-between overflow-hidden">
                <ViewModeComponent
                  items={itemsList}
                  isLoading={isLoading}
                  onEndOfScroll={getMoreItems}
                  hasMoreItems={hasMoreItems}
                  isTrash={isTrash}
                />
              </div>
            )}

            {
              /* EMPTY FOLDER */
              !hasItems &&
                !isLoading &&
                (hasFilters ? (
                  <Empty
                    icon={filesEmptyImage}
                    title={translate('views.recents.empty.noResults')}
                    subtitle={translate('views.recents.empty.dragNDrop')}
                    action={{
                      icon: UploadSimple,
                      style: 'elevated',
                      text: translate('views.recents.empty.uploadFiles'),
                      onClick: onUploadFileButtonClicked,
                    }}
                  />
                ) : isRecents ? (
                  <Empty
                    icon={filesEmptyImage}
                    title={translate('views.recents.empty.title')}
                    subtitle={translate('views.recents.empty.description')}
                  />
                ) : isTrash ? (
                  <Empty
                    icon={<EmptyTrash />}
                    title={translate('trash.empty-state.title')}
                    subtitle={translate('trash.empty-state.subtitle')}
                  />
                ) : (
                  <Empty
                    icon={<img className="w-36" alt="" src={folderEmptyImage} />}
                    title={translate('views.recents.empty.folderEmpty')}
                    subtitle={translate('views.recents.empty.folderEmptySubtitle')}
                    action={{
                      icon: UploadSimple,
                      style: 'elevated',
                      text: translate('views.recents.empty.uploadFiles'),
                      onClick: onUploadFileButtonClicked,
                    }}
                  />
                ))
            }

            {
              /* DRAG AND DROP */
              isOver && !isTrash && (
                <div
                  className="drag-over-effect pointer-events-none\
                    absolute flex h-full w-full items-end justify-center"
                ></div>
              )
            }
          </div>

          {!isTrash && (
            <>
              <input
                key={`file-${fileInputKey}`}
                className="hidden"
                ref={fileInputRef}
                type="file"
                onChange={onUploadFileInputChanged}
                multiple={true}
                data-test="input-file"
              />
              <input
                key={`folder-${folderInputKey}`}
                className="hidden"
                ref={folderInputRef}
                type="file"
                directory=""
                webkitdirectory=""
                onChange={onUploadFolderInputChanged}
                multiple={true}
                data-test="input-folder"
              />
            </>
          )}
        </div>
      </div>
    </div>
  );

  return !isTrash ? connectDropTarget(driveExplorer) || driveExplorer : driveExplorer;
};

declare module 'react' {
  interface HTMLAttributes<T> extends AriaAttributes, DOMAttributes<T> {
    // extends React's HTMLAttributes
    directory?: string;
    webkitdirectory?: string;
  }
}

const countTotalItemsInIRoot = (rootList: IRoot[]) => {
  let totalFilesToUpload = 0;

  rootList.forEach((n) => {
    totalFilesToUpload += n.childrenFiles.length;
    if (n.childrenFolders.length >= 1) {
      countTotalItemsInIRoot(n.childrenFolders);
    }
  });

  return totalFilesToUpload;
};

const uploadItems = async (props: DriveExplorerProps, rootList: IRoot[], files: File[]) => {
  const { dispatch, currentFolderId, onDragAndDropEnd, items } = props;
  const countTotalItemsToUpload: number = files.length + countTotalItemsInIRoot(rootList);

  if (countTotalItemsToUpload < 1000) {
    if (files.length) {
      const unrepeatedUploadedFiles = handleRepeatedUploadingFiles(files, items, dispatch) as File[];
      // files where dragged directly
      await dispatch(
        storageThunks.uploadItemsThunkNoCheck({
          files: unrepeatedUploadedFiles,
          parentFolderId: currentFolderId,
          options: {
            onSuccess: onDragAndDropEnd,
          },
        }),
      );
    }
    if (rootList.length) {
      const unrepeatedUploadedFolders = handleRepeatedUploadingFolders(rootList, items, dispatch) as IRoot[];
      if (unrepeatedUploadedFolders.length > 0)
        await dispatch(
          storageThunks.uploadFolderThunkNoCheck({
            root: unrepeatedUploadedFolders[0],
            currentFolderId,
            options: {
              onSuccess: onDragAndDropEnd,
            },
          }),
        );
    }
  } else {
    dispatch(uiActions.setIsUploadItemsFailsDialogOpen(true));
    notificationsService.show({
      text: 'The maximum is 1000 files per upload.',
      type: ToastType.Warning,
    });
  }
};

const dropTargetSpec: DropTargetSpec<DriveExplorerProps> = {
  drop: (props, monitor) => {
    const droppedData: { files: File[]; items: DataTransferItemList } = monitor.getItem();
    const isAlreadyDropped = monitor.didDrop();
    const namePathDestinationArray = props.namePath.map((level) => level.name);

    if (isAlreadyDropped) {
      return;
    }

    namePathDestinationArray[0] = '';

    const folderPath = namePathDestinationArray.join('/');

    transformDraggedItems(droppedData.items, folderPath).then(async ({ rootList, files }) => {
      await uploadItems(props, rootList, files);
    });
  },
};

const dropTargetCollect: DropTargetCollector<
  { isOver: boolean; connectDropTarget: ConnectDropTarget },
  DriveExplorerProps
> = (connect, monitor) => {
  const isOver = monitor.isOver({ shallow: true });

  return {
    isOver,
    connectDropTarget: connect.dropTarget(),
  };
};

export default connect((state: RootState) => {
  const currentFolderId: number = storageSelectors.currentFolderId(state);

  return {
    isAuthenticated: state.user.isAuthenticated,
    user: state.user.user,
    currentFolderId,
    selectedItems: state.storage.selectedItems,
    storageFilters: state.storage.filters,
    isCreateFolderDialogOpen: state.ui.isCreateFolderDialogOpen,
    isMoveItemsDialogOpen: state.ui.isMoveItemsDialogOpen,
    isDeleteItemsDialogOpen: state.ui.isDeleteItemsDialogOpen,
    isClearTrashDialogOpen: state.ui.isClearTrashDialogOpen,
    viewMode: state.storage.viewMode,
    namePath: state.storage.namePath,
    workspace: state.session.workspace,
    planLimit: planSelectors.planLimitToShow(state),
    planUsage: state.plan.planUsage,
  };
})(DropTarget([NativeTypes.FILE], dropTargetSpec, dropTargetCollect)(DriveExplorer));
