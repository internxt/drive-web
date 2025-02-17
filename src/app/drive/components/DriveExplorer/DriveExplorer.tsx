import { ArrowFatUp, FileArrowUp, FolderSimplePlus, Trash, UploadSimple } from '@phosphor-icons/react';
import { RefObject, createRef, useCallback, useEffect, useRef, useState } from 'react';
import { connect } from 'react-redux';

import { ConnectDropTarget, DropTarget, DropTargetCollector, DropTargetSpec } from 'react-dnd';
import { NativeTypes } from 'react-dnd-html5-backend';

import folderEmptyImage from 'assets/icons/light/folder-open.svg';
import { transformDraggedItems } from '../../../core/services/drag-and-drop.service';
import { Workspace } from '../../../core/types';
import Empty from '../../../shared/components/Empty/Empty';
import { AppDispatch, RootState } from '../../../store';
import { StorageFilters } from '../../../store/slices/storage/storage.model';
import DriveExplorerGrid from './DriveExplorerGrid/DriveExplorerGrid';
import DriveExplorerList from './DriveExplorerList/DriveExplorerList';

import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import { useHotkeys } from 'react-hotkeys-hook';
import moveItemsToTrash from '../../../../use_cases/trash/move-items-to-trash';

import { Role } from '@internxt/sdk/dist/drive/share/types';
import workspacesSelectors from '../../../store/slices/workspaces/workspaces.selectors';
import { t } from 'i18next';
import BannerWrapper from '../../../banners/BannerWrapper';
import deviceService from '../../../core/services/device.service';
import errorService from '../../../core/services/error.service';
import localStorageService, { STORAGE_KEYS } from '../../../core/services/local-storage.service';
import navigationService from '../../../core/services/navigation.service';
import RealtimeService, { SOCKET_EVENTS } from '../../../core/services/socket.service';
import ClearTrashDialog from '../../../drive/components/ClearTrashDialog/ClearTrashDialog';
import CreateFolderDialog from '../../../drive/components/CreateFolderDialog/CreateFolderDialog';
import DeleteItemsDialog from '../../../drive/components/DeleteItemsDialog/DeleteItemsDialog';
import {
  transformInputFilesToJSON,
  transformJsonFilesToItems,
} from '../../../drive/services/folder.service/uploadFolderInput.service';
import { useTranslationContext } from '../../../i18n/provider/TranslationProvider';
import notificationsService, { ToastType } from '../../../notifications/services/notifications.service';
import { AdvancedSharedItem } from '../../../share/types';
import { ContextMenu } from '@internxt/ui';
import { Tutorial } from '../../../shared/components/Tutorial/Tutorial';
import { getSignUpSteps } from '../../../shared/components/Tutorial/signUpSteps';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { planSelectors } from '../../../store/slices/plan';
import { storageActions } from '../../../store/slices/storage';
import storageSelectors from '../../../store/slices/storage/storage.selectors';
import storageThunks from '../../../store/slices/storage/storage.thunks';
import { fetchPaginatedFolderContentThunk } from '../../../store/slices/storage/storage.thunks/fetchFolderContentThunk';
import { fetchSortedFolderContentThunk } from '../../../store/slices/storage/storage.thunks/fetchSortedFolderContentThunk';
import {
  handleRepeatedUploadingFiles,
  handleRepeatedUploadingFolders,
} from '../../../store/slices/storage/storage.thunks/renameItemsThunk';
import { uiActions } from '../../../store/slices/ui';
import { userSelectors } from '../../../store/slices/user';
import { useTaskManagerGetNotifications } from '../../../tasks/hooks';
import { TaskStatus } from '../../../tasks/types';
import iconService from '../../services/icon.service';
import { DriveItemData, FileViewMode, FolderPath } from '../../types';
import EditItemNameDialog from '../EditItemNameDialog/EditItemNameDialog';
import ItemDetailsDialog from '../ItemDetailsDialog/ItemDetailsDialog';
import MoveItemsDialog from '../MoveItemsDialog/MoveItemsDialog';
import NameCollisionContainer from '../NameCollisionDialog/NameCollisionContainer';
import ShareDialog from '../ShareDialog/ShareDialog';
import StopSharingAndMoveToTrashDialogWrapper from '../StopSharingAndMoveToTrashDialogWrapper/StopSharingAndMoveToTrashDialogWrapper';
import UploadItemsFailsDialog from '../UploadItemsFailsDialog/UploadItemsFailsDialog';
import WarningMessageWrapper from '../WarningMessage/WarningMessageWrapper';
import './DriveExplorer.scss';
import { DriveTopBarItems } from './DriveTopBarItems';
import DriveTopBarActions from './components/DriveTopBarActions';
import { getAncestorsAndSetNamePath } from '../../../store/slices/storage/storage.thunks/goToFolderThunk';
import { IRoot } from '../../../store/slices/storage/types';
import { useTrashPagination } from '../../../drive/hooks/trash/useTrashPagination';
import { WorkspaceData } from '@internxt/sdk/dist/workspaces';
import { uploadFoldersWithManager } from '../../../network/UploadFolderManager';

export const UPLOAD_ITEMS_LIMIT = 3000;

interface DriveExplorerProps {
  title: JSX.Element | string;
  titleClassName?: string;
  isLoading: boolean;
  items: DriveItemData[];
  onItemsDeleted?: () => void;
  onItemsMoved?: () => void;
  onFileUploaded?: () => void;
  onFolderUploaded?: () => void;
  fetchFolderContent?: () => void;
  onFolderCreated?: () => void;
  onDragAndDropEnd?: () => void;
  user: UserSettings | undefined;
  currentFolderId: string;
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
  selectedWorkspace: WorkspaceData | null;
  planLimit: number;
  planUsage: number;
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
  roles: Role[];
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
    user,
    getTrashPaginated,
    roles,
    selectedWorkspace,
  } = props;
  const [isOpen, setIsOpen] = useState(false);
  const dispatch = useAppDispatch();
  const { translate } = useTranslationContext();
  const menuItemsRef = useRef<HTMLDivElement | null>(null);
  const menuContextItemsRef = useRef<HTMLDivElement | null>(null);

  const hasItems = items.length > 0;
  const hasFilters = storageFilters.text.length > 0;
  const hasAnyItemSelected = selectedItems.length > 0;

  const isRecents = title === translate('views.recents.head');
  const isTrash = title === translate('trash.trash');

  const itemToRename = useAppSelector((state: RootState) => state.storage.itemToRename);
  const isFileViewerOpen = useAppSelector((state: RootState) => state.ui.isFileViewerOpen);

  const [editNameItem, setEditNameItem] = useState<DriveItemData | null>(null);

  const [showStopSharingConfirmation, setShowStopSharingConfirmation] = useState(false);
  const order = useAppSelector((state: RootState) => state.storage.order);

  // UPLOAD ITEMS STATES
  const [fileInputRef] = useState<RefObject<HTMLInputElement>>(createRef());
  const [fileInputKey, setFileInputKey] = useState<number>(Date.now());
  const [folderInputRef] = useState<RefObject<HTMLInputElement>>(createRef());
  const [folderInputKey, setFolderInputKey] = useState<number>(Date.now());

  // PAGINATION STATES
  const [hasMoreItems, setHasMoreItems] = useState<boolean>(true);
  const hasMoreItemsToLoad = isTrash ? hasMoreItems : hasMoreFiles || hasMoreFolders;
  const isEmptyFolder = !isLoading && !hasMoreItemsToLoad;

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
    setHasMoreItems,
    order,
  });

  // RIGHT CLICK MENU STATES
  const [isListElementsHovered, setIsListElementsHovered] = useState<boolean>(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const [posX, setPosX] = useState(0);
  const [posY, setPosY] = useState(0);
  const [openedWithRightClick, setOpenedWithRightClick] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // ONBOARDING TUTORIAL STATES
  const [currentTutorialStep, setCurrentTutorialStep] = useState(0);
  const [showSecondTutorialStep, setShowSecondTutorialStep] = useState(false);
  const uploadFileButtonRef = useRef(null);
  const isSignUpTutorialCompleted = localStorageService.hasCompletedTutorial(user?.userId);
  const successNotifications = useTaskManagerGetNotifications({
    status: [TaskStatus.Success],
  });
  const divRef = useRef<HTMLDivElement | null>(null);

  const showTutorial =
    useAppSelector(userSelectors.hasSignedToday) &&
    !isSignUpTutorialCompleted &&
    (showSecondTutorialStep || currentTutorialStep === 0);
  const signupSteps = getSignUpSteps(
    {
      onNextStepClicked: () => {
        setTimeout(() => {
          onUploadFileButtonClicked();
        }, 0);
        passToNextStep();
      },
      stepOneTutorialRef: uploadFileButtonRef,
      offset: hasAnyItemSelected ? { x: divRef?.current?.offsetWidth ?? 0, y: 0 } : { x: 0, y: 0 },
    },
    {
      onNextStepClicked: () => {
        passToNextStep();
        localStorageService.set(STORAGE_KEYS.TUTORIAL_COMPLETED_ID, user?.userId as string);
      },
    },
  );

  const realtimeService = RealtimeService.getInstance();
  const handleFileCreatedEvent = (data) => {
    if (data.event === SOCKET_EVENTS.FILE_CREATED) {
      const folderId = data.payload.folderId;
      if (folderId === currentFolderId) {
        dispatch(
          storageActions.pushItems({
            updateRecents: true,
            folderIds: [folderId],
            items: [data.payload as DriveItemData],
          }),
        );
      }
    }
  };

  useEffect(() => {
    if (itemToRename) {
      setEditNameItem(itemToRename);
    }
  }, [itemToRename]);

  useEffect(() => {
    try {
      realtimeService.removeAllListeners();
      realtimeService.onEvent(handleFileCreatedEvent);
    } catch (err) {
      errorService.reportError(err);
    }
  }, [currentFolderId]);

  useEffect(() => {
    if (!isSignUpTutorialCompleted && currentTutorialStep === 1 && successNotifications.length > 0) {
      setShowSecondTutorialStep(true);
    }
  }, [successNotifications]);

  useEffect(() => {
    deviceService.redirectForMobile();
  }, []);

  useEffect(() => {
    if ((!isTrash && !hasMoreFolders) || (isTrash && !hasMoreTrashFolders)) {
      fetchItems();
    }
  }, [hasMoreFolders, hasMoreTrashFolders]);

  useEffect(() => {
    if (!isTrash && !hasMoreFiles) {
      setHasMoreItems(false);
    }
  }, [hasMoreFiles]);

  useEffect(() => {
    if (hasMoreFiles && hasMoreFolders) {
      setHasMoreItems(true);
    }
  }, [hasMoreFiles, hasMoreFolders]);

  useEffect(() => {
    resetPaginationState();
    fetchItems();
  }, [currentFolderId, order]);

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
  /*
  useEffect(() => {
    const handleContextmenu = (e) => {
      e.preventDefault();
      e.stopPropagation();
      setIsOpen((prev) => !prev);
    };
    document.addEventListener('mousedown', handleContextmenu);
    return function cleanup() {
      document.removeEventListener('mousedown', handleContextmenu);
    };
  }, []);*/

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

  const resetPaginationState = () => {
    dispatch(storageActions.resetTrash());
    setHasMoreItems(true);
    setHasMoreTrashFolders(true);
    setIsLoadingTrashItems(false);
  };

  const fetchItems = () =>
    isTrash ? getMoreTrashItems() : dispatch(fetchPaginatedFolderContentThunk(currentFolderId));

  const passToNextStep = () => {
    setCurrentTutorialStep(currentTutorialStep + 1);
  };

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
    errorService.addBreadcrumb({
      level: 'info',
      category: 'button',
      message: 'File upload button clicked',
      data: {
        currentFolderId: currentFolderId,
      },
    });
    fileInputRef.current?.click();
  }, [currentFolderId]);

  const onUploadFolderButtonClicked = useCallback((): void => {
    errorService.addBreadcrumb({
      level: 'info',
      category: 'button',
      message: 'Folder upload button clicked',
      data: {
        currentFolderId: currentFolderId,
      },
    });
    folderInputRef.current?.click();
  }, [currentFolderId]);

  const onUploadFileInputChanged = async (e) => {
    const files = e.target.files;

    if (files.length <= UPLOAD_ITEMS_LIMIT) {
      const unrepeatedUploadedFiles = (await handleRepeatedUploadingFiles(
        Array.from(files),
        dispatch,
        currentFolderId,
      )) as File[];
      dispatch(
        storageThunks.uploadItemsThunk({
          files: Array.from(unrepeatedUploadedFiles),
          parentFolderId: currentFolderId,
        }),
      ).then(() => {
        onFileUploaded && onFileUploaded();
        dispatch(fetchSortedFolderContentThunk(currentFolderId));
      });
      setFileInputKey(Date.now());
    } else {
      dispatch(uiActions.setIsUploadItemsFailsDialogOpen(true));
      notificationsService.show({
        text: translate('drive.uploadItems.advice'),
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

  const onCreateFolderButtonClicked = useCallback((): void => {
    errorService.addBreadcrumb({
      level: 'info',
      category: 'button',
      message: 'Create folder button clicked',
      data: {
        currentFolderId: currentFolderId,
      },
    });
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

  const EmptyTrash = () => (
    <div className="flex h-36 w-36 items-center justify-center rounded-full bg-gray-5">
      <Trash size={80} weight="thin" />
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

  const MenuItemToGetSize = () => (
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
      className="flex h-full grow flex-col"
      data-test="drag-and-drop-area"
      onContextMenu={isListElementsHovered ? () => setIsOpen(false) : handleContextMenuClick}
      onClick={() => setIsOpen(false)}
      ref={containerRef}
    >
      <DeleteItemsDialog onItemsDeleted={onItemsDeleted} />
      <CreateFolderDialog onFolderCreated={onFolderCreated} currentFolderId={currentFolderId} />
      <ShareDialog isDriveItem onShareItem={handleOnShareItem} />
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
      <MenuItemToGetSize />
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

      <div className="z-0 flex h-full w-full max-w-full grow">
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
                  <div
                    onClick={onCreateFolderButtonClicked}
                    data-cy="contextMenuCreateFolderButton"
                    className={'flex cursor-pointer items-center space-x-3 whitespace-nowrap'}
                  >
                    <FolderSimplePlus size={20} />
                    <p data-cy="contextMenuCreateFolderButtonText">{translate('actions.upload.folder')}</p>
                    <span className="ml-5 flex grow items-center justify-end text-sm text-gray-40">
                      <ArrowFatUp size={14} /> F
                    </span>
                  </div>
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
              className={`mr-20 ${isTrash ? 'min-w-0' : 'min-w-[200px]'} flex w-full flex-1 flex-row flex-wrap items-center text-lg ${titleClassName ?? ''}`}
            >
              {title}
            </div>
            {/* General Dropdown for Drive Explorer/Trash */}
            {!isTrash && (
              <div className="flex items-center justify-center">
                <DriveTopBarItems
                  stepOneTutorialRef={uploadFileButtonRef}
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
              driveActionsRef={divRef}
              roles={roles}
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

          <div className="z-0 flex h-full grow flex-col justify-between overflow-y-hidden">
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
              !hasItems &&
                isEmptyFolder &&
                !isLoadingTrashItems &&
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
                    contextMenuClick={handleContextMenuClick}
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

  return !isTrash ? (
    <Tutorial show={showTutorial} steps={signupSteps} currentStep={currentTutorialStep}>
      {connectDropTarget(driveExplorer) || driveExplorer}
    </Tutorial>
  ) : (
    driveExplorer
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
  const { dispatch, currentFolderId, onDragAndDropEnd, items } = props;

  if (files.length <= UPLOAD_ITEMS_LIMIT) {
    if (files.length) {
      errorService.addBreadcrumb({
        level: 'info',
        category: 'drag-and-drop',
        message: 'Dragged file to upload',
        data: {
          currentFolderId: currentFolderId,
          itemsDragged: items,
        },
      });
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
      errorService.addBreadcrumb({
        level: 'info',
        category: 'drag-and-drop',
        message: 'Dragged folder to upload',
        data: {
          currentFolderId: currentFolderId,
          itemsDragged: items,
        },
      });
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
