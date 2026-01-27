import { ArrowFatUp, FileArrowUp, FolderSimplePlus, Trash, UploadSimple } from '@phosphor-icons/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { connect } from 'react-redux';
import { usePaginationState, useTutorialState } from '../../hooks';
import { createFileUploadHandler, createFolderUploadHandler, UPLOAD_ITEMS_LIMIT } from './helpers/uploadHelpers';

import { ConnectDropTarget, DropTarget, DropTargetCollector, DropTargetSpec } from 'react-dnd';
import { NativeTypes } from 'react-dnd-html5-backend';

import folderEmptyImage from 'assets/icons/light/folder-open.svg';
import { transformDraggedItems } from 'services/drag-and-drop.service';
import Empty from 'components/Empty';
import { AppDispatch, RootState } from 'app/store';
import { StorageFilters } from 'app/store/slices/storage/storage.model';
import { DriveExplorerGrid, DriveExplorerList, DriveTopBarActions } from './components';

import { useHotkeys } from 'react-hotkeys-hook';
import { moveItemsToTrash } from 'views/Trash/services';

import { WorkspaceData } from '@internxt/sdk/dist/workspaces';
import { ContextMenu } from '@internxt/ui';
import { t } from 'i18next';
import BannerWrapper from 'app/banners/BannerWrapper';
import deviceService from 'services/device.service';
import errorService from 'services/error.service';
import navigationService from 'services/navigation.service';
import RealtimeService from 'services/socket.service';
import { ClearTrashDialog } from 'views/Trash/components';
import { CreateFolderDialog } from 'views/Drive/components';
import DeleteItemsDialog from 'views/Trash/components/DeleteItemsDialog';
import { useTrashPagination } from 'views/Trash/hooks/useTrashPagination';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import { uploadFoldersWithManager } from 'app/network/UploadFolderManager';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';
import { AdvancedSharedItem } from 'app/share/types';
import { Tutorial } from 'components/Tutorial';
import { getSignUpSteps } from 'components/signUpSteps';
import { useAppDispatch, useAppSelector } from 'app/store/hooks';
import { planSelectors } from 'app/store/slices/plan';
import { storageActions } from 'app/store/slices/storage';
import storageSelectors from 'app/store/slices/storage/storage.selectors';
import storageThunks from 'app/store/slices/storage/storage.thunks';
import { fetchPaginatedFolderContentThunk } from 'app/store/slices/storage/storage.thunks/fetchFolderContentThunk';
import { fetchSortedFolderContentThunk } from 'app/store/slices/storage/storage.thunks/fetchSortedFolderContentThunk';
import { getAncestorsAndSetNamePath } from 'app/store/slices/storage/storage.thunks/goToFolderThunk';
import {
  handleRepeatedUploadingFiles,
  handleRepeatedUploadingFolders,
} from 'app/store/slices/storage/storage.thunks/renameItemsThunk';
import { IRoot } from 'app/store/slices/storage/types';
import { uiActions } from 'app/store/slices/ui';
import workspacesSelectors from 'app/store/slices/workspaces/workspaces.selectors';
import iconService from 'app/drive/services/icon.service';
import { DriveItemData, FileViewMode, FolderPath } from 'app/drive/types';
import EditItemNameDialog from 'app/drive/components/EditItemNameDialog/EditItemNameDialog';
import ItemDetailsDialog from 'app/drive/components/ItemDetailsDialog/ItemDetailsDialog';
import MoveItemsDialog from 'app/drive/components/MoveItemsDialog/MoveItemsDialog';
import NameCollisionContainer from 'app/drive/components/NameCollisionDialog/NameCollisionContainer';
import StopSharingAndMoveToTrashDialogWrapper from 'views/Trash/components/StopSharingAndMoveToTrashDialogWrapper';
import UploadItemsFailsDialog from 'app/drive/components/UploadItemsFailsDialog/UploadItemsFailsDialog';
import WarningMessageWrapper from 'views/Home/components/WarningMessageWrapper';
import './DriveExplorer.scss';
import { DriveTopBarItems } from './DriveTopBarItems';
import { ShareDialogWrapper } from 'app/drive/components/ShareDialog/ShareDialogWrapper';
import { EventData, SOCKET_EVENTS } from 'services/types/socket.types';

const MenuItemToGetSize = ({
  isTrash,
  translate,
  menuItemsRef,
}: {
  isTrash: boolean;
  translate: (key: string) => string;
  menuItemsRef: React.RefObject<HTMLDivElement>;
}) => (
  <div
    className={
      'mt-1 rounded-md border border-gray-10 bg-surface py-1.5 text-base shadow-subtle-hard outline-none dark:bg-gray-5'
    }
    style={{
      minWidth: '180px',
      position: 'fixed',
      top: -9999,
      left: -9999,
    }}
    ref={menuItemsRef}
  >
    {!isTrash && (
      <>
        <div className="flex cursor-pointer items-center space-x-3 whitespace-nowrap py-2 pl-3 pr-5 text-gray-80 hover:bg-gray-5 dark:hover:bg-gray-10">
          <FolderSimplePlus size={20} />
          <p>{translate('actions.upload.folder')}</p>
        </div>

        <div className="mx-3 my-px flex border-t border-gray-5" />

        <div
          className={
            'flex cursor-pointer items-center space-x-3 whitespace-nowrap py-2 pl-3 pr-5 text-gray-80 hover:bg-gray-5 dark:hover:bg-gray-10'
          }
        >
          <FileArrowUp size={20} />
          <p className="ml-3">{translate('actions.upload.uploadFiles')}</p>
        </div>
      </>
    )}
    <div
      className={
        'flex cursor-pointer items-center space-x-3 whitespace-nowrap py-2 pl-3 pr-5 text-gray-80 hover:bg-gray-5 dark:hover:bg-gray-10'
      }
    >
      <UploadSimple size={20} />
      <p className="ml-3">{translate('actions.upload.uploadFolder')}</p>
    </div>
  </div>
);

const EmptyTrash = () => (
  <div className="flex h-36 w-36 items-center justify-center rounded-full bg-gray-5">
    <Trash size={80} weight="thin" />
  </div>
);

interface DriveExplorerProps {
  title: JSX.Element | string;
  titleClassName?: string;
  isLoading: boolean;
  items: DriveItemData[];
  onItemsDeleted?: () => void;
  onItemsMoved?: () => void;
  onFileUploaded?: () => void;
  fetchFolderContent?: () => void;
  onFolderCreated?: () => void;
  onDragAndDropEnd?: () => void;
  currentFolderId: string;
  selectedItems: DriveItemData[];
  storageFilters: StorageFilters;
  viewMode: FileViewMode;
  namePath: FolderPath[];
  dispatch: AppDispatch;
  selectedWorkspace: WorkspaceData | null;
  isOver: boolean;
  connectDropTarget: ConnectDropTarget;
  folderOnTrashLength: number;
  filesOnTrashLength: number;
  hasMoreFolders: boolean;
  hasMoreFiles: boolean;
  getTrashPaginated?: (
    limit: number,
    offset: number | undefined,
    type: 'files' | 'folders',
    root: boolean,
    sort: 'plainName' | 'updatedAt',
    order: 'ASC' | 'DESC',
    folderId?: number | undefined,
  ) => Promise<{ finished: boolean; itemsRetrieved: number }>;
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
    fetchFolderContent,
    isOver,
    connectDropTarget,
    storageFilters,
    currentFolderId,
    onFileUploaded,
    onItemsMoved,
    folderOnTrashLength,
    filesOnTrashLength,
    hasMoreFolders,
    hasMoreFiles,
    getTrashPaginated,
    selectedWorkspace,
  } = props;
  const dispatch = useAppDispatch();
  const { translate } = useTranslationContext();

  const hasItems = items.length > 0;
  const hasFilters = storageFilters.text.length > 0;
  const hasAnyItemSelected = selectedItems.length > 0;

  const isRecents = title === translate('views.recents.head');
  const isTrash = title === translate('trash.trash');

  // Upload state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const [fileInputKey, setFileInputKey] = useState<number>(0);
  const [folderInputKey, setFolderInputKey] = useState<number>(0);
  const resetFileInput = () => setFileInputKey(Date.now());
  const resetFolderInput = () => setFolderInputKey(Date.now());

  // Context menu state
  const [isOpen, setIsOpen] = useState(false);
  const [isListElementsHovered, setIsListElementsHovered] = useState<boolean>(false);
  const [posX, setPosX] = useState(0);
  const [posY, setPosY] = useState(0);
  const [openedWithRightClick, setOpenedWithRightClick] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const menuItemsRef = useRef<HTMLDivElement | null>(null);
  const menuContextItemsRef = useRef<HTMLDivElement | null>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const paginationState = usePaginationState({ isTrash, hasMoreFiles, hasMoreFolders });
  const tutorialState = useTutorialState();

  const itemToRename = useAppSelector((state: RootState) => state.storage.itemToRename);
  const isFileViewerOpen = useAppSelector((state: RootState) => state.ui.isFileViewerOpen);

  const [editNameItem, setEditNameItem] = useState<DriveItemData | null>(null);

  const [showStopSharingConfirmation, setShowStopSharingConfirmation] = useState(false);
  const order = useAppSelector((state: RootState) => state.storage.order);

  const hasMoreItemsToLoad = paginationState.hasMoreItemsToLoad;
  const isEmptyFolder = !isLoading && !hasMoreItemsToLoad;

  const renderEmptyState = () => {
    if (hasFilters) {
      return (
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
      );
    }
    if (isRecents) {
      return (
        <Empty
          icon={filesEmptyImage}
          title={translate('views.recents.empty.title')}
          subtitle={translate('views.recents.empty.description')}
        />
      );
    }
    if (isTrash) {
      return (
        <Empty
          icon={<EmptyTrash />}
          title={translate('trash.empty-state.title')}
          subtitle={translate('trash.empty-state.subtitle')}
        />
      );
    }
    return (
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
        contextMenuClick={handleContextMenuClick}
      />
    );
  };

  // TRASH PAGINATION
  const {
    isLoadingTrashItems,
    hasMoreTrashFolders,
    setHasMoreTrashFolders,
    setIsLoadingTrashItems,
    getMoreTrashItems,
  } = useTrashPagination({
    getTrashPaginated,
    folderOnTrashLength,
    isTrash: isTrash,
    filesOnTrashLength,
    setHasMoreItems: paginationState.setHasMoreItems,
    order,
  });

  const signupSteps = getSignUpSteps(
    {
      onNextStepClicked: () => {
        setTimeout(() => {
          onUploadFileButtonClicked();
        }, 0);
        tutorialState.passToNextStep();
      },
      stepOneTutorialRef: tutorialState.uploadFileButtonRef,
      offset: hasAnyItemSelected ? { x: tutorialState.divRef?.current?.offsetWidth ?? 0, y: 0 } : { x: 0, y: 0 },
    },
    {
      onNextStepClicked: () => {
        tutorialState.passToNextStep();
      },
    },
  );

  const realtimeService = RealtimeService.getInstance();
  const handleFileCreatedEvent = useCallback(
    (data: EventData) => {
      if (data.event === SOCKET_EVENTS.FILE_CREATED) {
        const item = data.payload;
        if (item.folderUuid === currentFolderId) {
          dispatch(
            storageActions.pushItems({
              updateRecents: true,
              folderIds: [item.folderUuid],
              items: [item],
            }),
          );
        }
      }
    },
    [currentFolderId, dispatch],
  );

  useEffect(() => {
    if (itemToRename) {
      setEditNameItem(itemToRename);
    }
  }, [itemToRename]);

  useEffect(() => {
    try {
      const cleanup = realtimeService.onEvent(handleFileCreatedEvent);

      return cleanup;
    } catch (err) {
      errorService.reportError(err);
    }
  }, [handleFileCreatedEvent]);

  useEffect(() => {
    deviceService.redirectForMobile();
  }, []);

  useEffect(() => {
    if (
      menuItemsRef.current &&
      (menuItemsRef.current.offsetHeight !== dimensions.height ||
        menuItemsRef.current?.offsetWidth !== dimensions.width)
    ) {
      setDimensions({
        width: menuItemsRef?.current?.offsetWidth || 0,
        height: menuItemsRef?.current?.offsetHeight || 0,
      });
    }
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('contextmenu', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('contextmenu', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if ((!isTrash && !hasMoreFolders) || (isTrash && !hasMoreTrashFolders)) {
      fetchItems();
    }
  }, [hasMoreFolders, hasMoreTrashFolders]);

  useEffect(() => {
    resetPaginationState();
    fetchItems();
  }, [currentFolderId, order]);

  const resetPaginationState = () => {
    dispatch(storageActions.resetTrash());
    paginationState.resetPaginationState();
    setHasMoreTrashFolders(true);
    setIsLoadingTrashItems(false);
  };

  const fetchItems = () =>
    isTrash ? getMoreTrashItems() : dispatch(fetchPaginatedFolderContentThunk(currentFolderId));

  const onDetailsButtonClicked = useCallback(
    (item: DriveItemData | AdvancedSharedItem) => {
      if (item.isFolder) {
        navigationService.pushFolder(item.uuid, selectedWorkspace?.workspaceUser.workspaceId);
      } else {
        navigationService.pushFile(item.uuid, selectedWorkspace?.workspaceUser.workspaceId);
      }
    },
    [dispatch],
  );

  const onUploadFileButtonClicked = useCallback((): void => {
    fileInputRef.current?.click();
  }, [currentFolderId]);

  const onUploadFolderButtonClicked = useCallback((): void => {
    folderInputRef.current?.click();
  }, [currentFolderId]);

  const onUploadFileInputChanged = createFileUploadHandler(dispatch, currentFolderId, onFileUploaded, resetFileInput);

  const onUploadFolderInputChanged = createFolderUploadHandler(currentFolderId, props, uploadItems, resetFolderInput);

  const onCreateFolderButtonClicked = useCallback((): void => {
    dispatch(uiActions.setIsCreateFolderDialogOpen(true));
  }, [currentFolderId]);

  const onDeletePermanentlyButtonClicked = (): void => {
    if (selectedItems.length > 0) {
      dispatch(storageActions.setItemsToDelete(selectedItems));
      dispatch(uiActions.setIsDeleteItemsDialogOpen(true));
    } else {
      dispatch(uiActions.setIsClearTrashDialogOpen(true));
    }
  };

  const onCloseEditItemDialog = (newItem) => {
    if (newItem && editNameItem) {
      if (isFileViewerOpen) {
        dispatch(uiActions.setCurrentEditingNameDirty(newItem.plainName ?? newItem.name));
      } else if (itemToRename && editNameItem.isFolder) {
        getAncestorsAndSetNamePath(newItem.uuid, dispatch);
      }
    }
    dispatch(storageActions.setItemToRename(null));
    setEditNameItem(null);
  };

  const viewModes = {
    [FileViewMode.List]: DriveExplorerList,
    [FileViewMode.Grid]: DriveExplorerGrid,
  };

  const ViewModeComponent = viewModes[isTrash ? FileViewMode.List : viewMode];

  const FileIcon = iconService.getItemIcon(false);
  const filesEmptyImage = (
    <div className="relative h-32 w-32">
      <FileIcon className="absolute -top-2.5 left-7 rotate-10 drop-shadow-soft" />
      <FileIcon className="absolute -left-7 top-0.5 -rotate-10 drop-shadow-soft" />
    </div>
  );

  const handleContextMenuClick = (event) => {
    event.preventDefault();
    const childWidth = menuItemsRef?.current?.offsetWidth ?? 180;
    const childHeight = menuItemsRef?.current?.offsetHeight ?? 300;

    let x = event.clientX;
    let y = event.clientY;

    if (event.clientX + childWidth > innerWidth) {
      x = x - childWidth;
    }

    if (event.clientY + childHeight > innerHeight) {
      y = y - childHeight;
    }

    setPosX(x);
    setPosY(y);
    setOpenedWithRightClick(true);
    setIsOpen(true);
    menuButtonRef.current?.click();
  };

  const resetPaginationStateAndFetchDriveFolderContent = (currentFolderId: string) => {
    resetPaginationState();
    dispatch(fetchSortedFolderContentThunk(currentFolderId));
  };

  const handleOnShareItem = useCallback(() => {
    setTimeout(() => {
      fetchFolderContent?.() ?? resetPaginationStateAndFetchDriveFolderContent(currentFolderId);
    }, 500);
  }, [currentFolderId, fetchFolderContent]);

  const onSuccessEditingName = useCallback(() => {
    setTimeout(() => dispatch(fetchSortedFolderContentThunk(currentFolderId)), 500);
  }, [currentFolderId]);

  const onOpenStopSharingAndMoveToTrashDialog = useCallback(() => {
    setShowStopSharingConfirmation(true);
  }, []);

  const onCloseStopSharingAndMoveToTrashDialog = useCallback(() => {
    setShowStopSharingConfirmation(false);
  }, []);

  const moveItemsToTrashOnStopSharing = async (items) => {
    const itemsToTrash = items.map((selectedShareItem) => ({
      ...selectedShareItem,
      isFolder: selectedShareItem.isFolder,
    }));

    await moveItemsToTrash(itemsToTrash);

    setTimeout(async () => {
      dispatch(fetchSortedFolderContentThunk(currentFolderId));
    }, 500);
  };

  useHotkeys('shift+F', () => {
    if (isOpen) {
      setIsOpen(false);
      onCreateFolderButtonClicked();
    }
  });

  const driveExplorer = (
    <div
      role="none"
      className="flex h-full grow flex-col"
      data-test="drag-and-drop-area"
      onContextMenu={isListElementsHovered ? () => setIsOpen(false) : handleContextMenuClick}
      onClick={() => setIsOpen(false)}
      ref={containerRef}
    >
      <DeleteItemsDialog onItemsDeleted={onItemsDeleted} />
      <CreateFolderDialog onFolderCreated={onFolderCreated} currentFolderId={currentFolderId} />
      <ShareDialogWrapper isDriveItem onShareItem={handleOnShareItem} />
      <NameCollisionContainer />
      <MoveItemsDialog
        items={[...items]}
        onItemsMoved={() => {
          dispatch(fetchSortedFolderContentThunk(currentFolderId));
          onItemsMoved?.();
        }}
        isTrash={isTrash}
      />
      <ClearTrashDialog onItemsDeleted={onItemsDeleted} />
      <UploadItemsFailsDialog />
      <MenuItemToGetSize isTrash={isTrash} translate={translate} menuItemsRef={menuItemsRef} />
      <ItemDetailsDialog onDetailsButtonClicked={onDetailsButtonClicked} />
      {editNameItem && (
        <EditItemNameDialog
          item={editNameItem}
          isOpen={true}
          onSuccess={onSuccessEditingName}
          onClose={onCloseEditItemDialog}
        />
      )}

      {!isTrash && showStopSharingConfirmation && (
        <StopSharingAndMoveToTrashDialogWrapper
          selectedItems={selectedItems}
          showStopSharingConfirmation={showStopSharingConfirmation}
          onClose={onCloseStopSharingAndMoveToTrashDialog}
          moveItemsToTrash={moveItemsToTrashOnStopSharing}
        />
      )}
      <BannerWrapper />

      <div className="flex h-full w-full max-w-full grow">
        {!isTrash && isOpen && (
          <ContextMenu
            item={'item'}
            menuItemsRef={menuContextItemsRef}
            openedFromRightClick={openedWithRightClick}
            posX={posX}
            posY={posY}
            isContextMenuCutOff={false}
            genericEnterKey={() => {}}
            handleMenuClose={() => {
              setIsOpen(false);
            }}
            isOpen={isOpen}
            menu={[
              {
                node: (
                  <button
                    type="button"
                    onClick={onCreateFolderButtonClicked}
                    data-cy="contextMenuCreateFolderButton"
                    className={
                      'flex w-full cursor-pointer items-center space-x-3 whitespace-nowrap bg-transparent p-0 text-left'
                    }
                  >
                    <FolderSimplePlus size={20} />
                    <p data-cy="contextMenuCreateFolderButtonText">{translate('actions.upload.folder')}</p>
                    <span className="ml-5 flex grow items-center justify-end text-sm text-gray-40">
                      <ArrowFatUp size={14} /> F
                    </span>
                  </button>
                ),
              },
              {
                icon: FileArrowUp,
                name: translate('actions.upload.uploadFiles'),
                action: onUploadFileButtonClicked,
              },
              {
                icon: UploadSimple,
                name: translate('actions.upload.uploadFolder'),
                action: onUploadFolderButtonClicked,
              },
            ]}
          />
        )}
        <div className="flex w-1 grow flex-col">
          <div className="z-10 flex flex-wrap min-h-14 max-w-full shrink-0 justify-between px-5 py-2 ">
            <div
              className={`mr-20 ${isTrash ? 'min-w-0' : 'min-w-[200px]'} flex w-full z-20 flex-1 flex-row flex-wrap items-center text-lg ${titleClassName ?? ''}`}
            >
              {title}
            </div>
            {/* General Dropdown for Drive Explorer/Trash */}
            {!isTrash && (
              <div className="flex items-center justify-center">
                <DriveTopBarItems
                  stepOneTutorialRef={tutorialState.uploadFileButtonRef}
                  onCreateFolderButtonClicked={onCreateFolderButtonClicked}
                  onUploadFileButtonClicked={onUploadFileButtonClicked}
                  onUploadFolderButtonClicked={onUploadFolderButtonClicked}
                />
              </div>
            )}
            <DriveTopBarActions
              hasAnyItemSelected={hasAnyItemSelected}
              isTrash={isTrash}
              selectedItems={selectedItems}
              currentFolderId={currentFolderId}
              setEditNameItem={setEditNameItem}
              hasItems={hasItems}
              driveActionsRef={tutorialState.divRef}
            />
          </div>

          {isTrash && isOpen && (
            <ContextMenu
              item={'item'}
              menuItemsRef={menuContextItemsRef}
              openedFromRightClick={openedWithRightClick}
              posX={posX}
              posY={posY}
              isContextMenuCutOff={false}
              genericEnterKey={() => {}}
              handleMenuClose={() => {
                setIsOpen(false);
              }}
              isOpen={isOpen}
              menu={[
                {
                  icon: Trash,
                  name: translate('drive.clearTrash.accept'),
                  action: onDeletePermanentlyButtonClicked,
                },
              ]}
            />
          )}

          <div className="flex h-full grow flex-col justify-between overflow-y-hidden">
            <WarningMessageWrapper />

            <div className="flex grow flex-col justify-between overflow-hidden">
              <ViewModeComponent
                folderId={currentFolderId}
                items={items}
                isLoading={isTrash ? isLoadingTrashItems : isLoading}
                onEndOfScroll={fetchItems}
                hasMoreItems={hasMoreItemsToLoad}
                isTrash={isTrash}
                onHoverListItems={(areHovered) => {
                  setIsListElementsHovered(areHovered);
                }}
                title={title}
                onOpenStopSharingAndMoveToTrashDialog={onOpenStopSharingAndMoveToTrashDialog}
                showStopSharingConfirmation={showStopSharingConfirmation}
                resetPaginationState={resetPaginationState}
              />
            </div>
            {
              /* EMPTY FOLDER */
              !hasItems && isEmptyFolder && !isLoadingTrashItems && renderEmptyState()
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

  if (isTrash) {
    return driveExplorer;
  }

  return (
    <Tutorial show={tutorialState.showTutorial} steps={signupSteps} currentStep={tutorialState.currentTutorialStep}>
      {connectDropTarget(driveExplorer) || driveExplorer}
    </Tutorial>
  );
};

declare module 'react' {
  interface HTMLAttributes<T> extends AriaAttributes, DOMAttributes<T> {
    // extends React's HTMLAttributes
    directory?: string;
    webkitdirectory?: string;
  }
}

const uploadItems = async (props: DriveExplorerProps, rootList: IRoot[], files: File[]) => {
  const { dispatch, currentFolderId, onDragAndDropEnd } = props;

  if (files.length <= UPLOAD_ITEMS_LIMIT) {
    if (files.length) {
      const unrepeatedUploadedFiles = (await handleRepeatedUploadingFiles(files, dispatch, currentFolderId)) as File[];
      // files where dragged directly
      await dispatch(
        storageThunks.uploadItemsThunk({
          files: unrepeatedUploadedFiles,
          parentFolderId: currentFolderId,
          options: {
            onSuccess: onDragAndDropEnd,
            disableDuplicatedNamesCheck: true,
          },
        }),
      ).then(() => {
        dispatch(fetchSortedFolderContentThunk(currentFolderId));
      });
    }
    if (rootList.length) {
      const unrepeatedUploadedFolders = (await handleRepeatedUploadingFolders(
        rootList,
        dispatch,
        currentFolderId,
      )) as IRoot[];

      if (unrepeatedUploadedFolders.length > 0) {
        const folderDataToUpload = unrepeatedUploadedFolders.map((root) => ({
          root,
          currentFolderId,
          options: {
            onSuccess: onDragAndDropEnd,
          },
        }));

        await uploadFoldersWithManager({
          payload: folderDataToUpload,
          selectedWorkspace: props.selectedWorkspace,
          dispatch,
        });
        dispatch(fetchSortedFolderContentThunk(currentFolderId));
      }
    }
  } else {
    dispatch(uiActions.setIsUploadItemsFailsDialogOpen(true));
    notificationsService.show({
      text: t('drive.uploadItems.advice'),
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
  const currentFolderId: string = storageSelectors.currentFolderId(state);
  const selectedWorkspace = workspacesSelectors.getSelectedWorkspace(state);
  const hasMoreFolders = state.storage.hasMoreDriveFolders[currentFolderId] ?? true;
  const hasMoreFiles = state.storage.hasMoreDriveFiles[currentFolderId] ?? true;

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
    selectedWorkspace: selectedWorkspace,
    planLimit: planSelectors.planLimitToShow(state),
    planUsage: planSelectors.planUsageToShow(state),
    folderOnTrashLength: state.storage.folderOnTrashLength,
    filesOnTrashLength: state.storage.filesOnTrashLength,
    hasMoreFolders,
    hasMoreFiles,
    roles: state.shared.roles,
  };
})(DropTarget([NativeTypes.FILE], dropTargetSpec, dropTargetCollect)(DriveExplorer));
