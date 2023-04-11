import { createRef, useState, RefObject, useEffect, useRef, LegacyRef } from 'react';
import { connect, useSelector } from 'react-redux';
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
  ArrowFatUp,
} from 'phosphor-react';
import FolderSimpleArrowUp from 'assets/icons/FolderSimpleArrowUp.svg';

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
import Button from '../../../shared/components/Button/Button';
import storageSelectors from '../../../store/slices/storage/storage.selectors';
import { planSelectors, PlanState } from '../../../store/slices/plan';
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
import { useAppDispatch, useAppSelector } from 'app/store/hooks';
import useDriveItemStoreProps from './DriveExplorerItem/hooks/useDriveStoreProps';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';
import {
  handleRepeatedUploadingFiles,
  handleRepeatedUploadingFolders,
} from '../../../store/slices/storage/storage.thunks/renameItemsThunk';
import NameCollisionContainer from '../NameCollisionDialog/NameCollisionContainer';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import { Menu, Transition } from '@headlessui/react';
import { useHotkeys } from 'react-hotkeys-hook';
import { getTrashPaginated } from '../../../../use_cases/trash/get_trash';
import './DriveExplorer.scss';
import TooltipElement, { DELAY_SHOW_MS } from '../../../shared/components/Tooltip/Tooltip';
import { Tutorial } from '../../../shared/components/Tutorial/Tutorial';
import { userSelectors } from '../../../store/slices/user';
import localStorageService, { STORAGE_KEYS } from '../../../core/services/local-storage.service';
import { getSignUpSteps } from '../../../shared/components/Tutorial/signUpSteps';
import { useTaskManagerGetNotifications } from '../../../tasks/hooks';
import { TaskStatus } from '../../../tasks/types';
import BannerWrapper from 'app/banners/BannerWrapper';

const PAGINATION_LIMIT = 50;
const TRASH_PAGINATION_OFFSET = 50;
const UPLOAD_ITEMS_LIMIT = 1000;

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
  folderOnTrashLength: number;
  filesOnTrashLength: number;
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
    folderOnTrashLength,
    filesOnTrashLength,
  } = props;
  const dispatch = useAppDispatch();
  const { translate } = useTranslationContext();
  const [fileInputRef] = useState<RefObject<HTMLInputElement>>(createRef());
  const [fileInputKey, setFileInputKey] = useState<number>(Date.now());
  const [folderInputRef] = useState<RefObject<HTMLInputElement>>(createRef());
  const [folderInputKey, setFolderInputKey] = useState<number>(Date.now());

  const [fakePaginationLimit, setFakePaginationLimit] = useState<number>(PAGINATION_LIMIT);
  const [hasMoreItems, setHasMoreItems] = useState<boolean>(true);
  const [hasMoreTrashFolders, setHasMoreTrashFolders] = useState<boolean>(true);
  const [paginatedTrashItems, setPaginatedTrashItems] = useState<DriveItemData[]>([]);
  const [timesCalled, setTimesCalled] = useState<number>(0);

  const [isListElementsHovered, setIsListElementsHovered] = useState<boolean>(false);

  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const menuItemsRef = useRef<HTMLDivElement | null>(null);
  const [posX, setPosX] = useState(0);
  const [posY, setPosY] = useState(0);
  const [openedWithRightClick, setOpenedWithRightClick] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  const [currentTutorialStep, setCurrentTutorialStep] = useState(0);
  const passToNextStep = () => {
    setCurrentTutorialStep(currentTutorialStep + 1);
  };

  const isSignUpTutorialCompleted = localStorageService.getIsSignUpTutorialCompleted();
  const successNotifications = useTaskManagerGetNotifications({
    status: [TaskStatus.Success],
  });

  const [showSecondTutorialStep, setShowSecondTutorialStep] = useState(false);

  const plan = useSelector<RootState, PlanState>((state) => state.plan);

  useEffect(() => {
    if (!isSignUpTutorialCompleted && currentTutorialStep === 1 && successNotifications.length > 0) {
      setShowSecondTutorialStep(true);
    }
  }, [successNotifications]);

  const showTutorial =
    useAppSelector(userSelectors.hasSignedToday) &&
    !isSignUpTutorialCompleted &&
    (showSecondTutorialStep || currentTutorialStep === 0);

  const stepOneTutorialRef = useRef(null);
  const signupSteps = getSignUpSteps(
    {
      onNextStepClicked: () => {
        setTimeout(() => {
          onUploadFileButtonClicked();
        }, 0);
        passToNextStep();
      },
      stepOneTutorialRef,
    },
    {
      onNextStepClicked: () => {
        passToNextStep();
        localStorageService.set(STORAGE_KEYS.SIGN_UP_TUTORIAL_COMPLETED, 'true');
      },
    },
  );

  const hasItems = items.length > 0;
  const hasFilters = storageFilters.text.length > 0;
  const hasAnyItemSelected = selectedItems.length > 0;
  const isSelectedItemShared = selectedItems[0]?.shares?.length !== 0;

  useEffect(() => {
    if (isTrash && paginatedTrashItems.length !== items.length) {
      setPaginatedTrashItems(items);
    }
  }, [items]);

  useEffect(() => {
    const isTrashAndNotHasItems = isTrash;
    if (isTrashAndNotHasItems) {
      getMoreTrashFolders();
    }
  }, []);

  useEffect(() => {
    const thereIsNotMoreFoldersAndFewerItems =
      !hasMoreTrashFolders && folderOnTrashLength < TRASH_PAGINATION_OFFSET && timesCalled === 1;

    if (thereIsNotMoreFoldersAndFewerItems) {
      getMoreTrashFiles();
    }
  }, [timesCalled]);

  //TODO: MOVE PAGINATED TRASH LOGIC OUT OF VIEW
  const getMoreTrashFolders = async () => {
    const result = await getTrashPaginated(TRASH_PAGINATION_OFFSET, folderOnTrashLength, 'folders', true);
    const existsMoreFolders = !result.finished;

    setHasMoreTrashFolders(existsMoreFolders);
    setTimesCalled(timesCalled + 1);
  };

  const getMoreTrashFiles = async () => {
    const result = await getTrashPaginated(TRASH_PAGINATION_OFFSET, filesOnTrashLength, 'files', true);

    const existsMoreItems = !result.finished;
    setHasMoreItems(existsMoreItems);
    setTimesCalled(timesCalled + 1);
  };

  const getMoreTrashItems = hasMoreTrashFolders ? getMoreTrashFolders : getMoreTrashFiles;

  useEffect(() => {
    deviceService.redirectForMobile();
  }, []);

  useEffect(() => {
    setHasMoreItems(true);
    setFakePaginationLimit(PAGINATION_LIMIT);
  }, [currentFolderId]);

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

    if (files.length < UPLOAD_ITEMS_LIMIT) {
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

  const onCreateFolderButtonClicked = (): void => {
    dispatch(uiActions.setIsCreateFolderDialogOpen(true));
  };

  const onBulkDeleteButtonClicked = (): void => {
    moveItemsToTrash(selectedItems);
  };

  const onDeletePermanentlyButtonClicked = (): void => {
    if (selectedItems.length > 0) {
      dispatch(storageActions.setItemsToDelete(selectedItems));
      dispatch(uiActions.setIsDeleteItemsDialogOpen(true));
    } else {
      dispatch(uiActions.setIsClearTrashDialogOpen(true));
    }
  };

  const onRecoverButtonClicked = (): void => {
    //Recover selected (you can select all) files or folders from Trash
    dispatch(storageActions.setItemsToMove(selectedItems));
    dispatch(uiActions.setIsMoveItemsDialogOpen(true));
  };

  const onSelectedOneItemShare = (e): void => {
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
    if (existsMoreItems) setFakePaginationLimit(fakePaginationLimit + PAGINATION_LIMIT);
  };

  const getLimitedItems = () => items.slice(0, fakePaginationLimit);

  const onSelectedOneItemRename = (e): void => {
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
    [FileViewMode.List]: (
      <SquaresFour
        className="h-6 w-6"
        data-tooltip-id="viewMode-tooltip"
        data-tooltip-content={translate('drive.viewMode.gridMode')}
        data-tooltip-place="bottom"
      />
    ),
    [FileViewMode.Grid]: (
      <Rows
        className="h-6 w-6"
        data-tooltip-id="viewMode-tooltip"
        data-tooltip-content={translate('drive.viewMode.listMode')}
        data-tooltip-place="bottom"
      />
    ),
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

  const EmptyTrash = () => (
    <div className="flex h-36 w-36 items-center justify-center rounded-full bg-gray-5">
      <Trash size={80} weight="thin" />
    </div>
  );

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

  const handleContextMenuClick = (event) => {
    event.preventDefault();
    const childWidth = menuItemsRef?.current?.offsetWidth || 180;
    const childHeight = menuItemsRef?.current?.offsetHeight || 300;

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
    menuButtonRef.current?.click();
  };

  const MenuItemToGetSize = () => (
    <div
      className={
        'outline-none mt-1 rounded-md border border-black border-opacity-8 bg-white py-1.5 text-base shadow-subtle-hard'
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
          <div className="flex cursor-pointer items-center space-x-3 whitespace-nowrap py-2 pl-3 pr-5 text-gray-80 hover:bg-gray-5">
            <FolderSimplePlus size={20} />
            <p>{translate('actions.upload.folder')}</p>
          </div>

          <div className="my-px mx-3 flex border-t border-gray-5" />

          <div
            className={
              'flex cursor-pointer items-center space-x-3 whitespace-nowrap py-2 pl-3 pr-5 text-gray-80 hover:bg-gray-5'
            }
          >
            <FileArrowUp size={20} />
            <p className="ml-3">{translate('actions.upload.uploadFiles')}</p>
          </div>
        </>
      )}
      <div
        className={
          'flex cursor-pointer items-center space-x-3 whitespace-nowrap py-2 pl-3 pr-5 text-gray-80 hover:bg-gray-5'
        }
      >
        <UploadSimple size={20} />
        <p className="ml-3">{translate('actions.upload.uploadFolder')}</p>
      </div>
    </div>
  );

  const DriveTopBarItems = (): JSX.Element => (
    <div className="flex items-center space-x-2">
      <div ref={stepOneTutorialRef} className="flex items-center justify-center">
        <Button variant="primary" onClick={onUploadFileButtonClicked}>
          <div className="flex items-center justify-center space-x-2.5">
            <div className="flex items-center space-x-0.5">
              <UploadSimple weight="fill" size={24} />
              <span className="font-medium">{translate('actions.upload.uploadFiles')}</span>
            </div>
          </div>
        </Button>
      </div>
      <div
        className="relative flex items-center justify-center"
        data-tooltip-id="uploadFolder-tooltip"
        data-tooltip-content={translate('actions.upload.uploadFolder')}
        data-tooltip-place="bottom"
      >
        <Button variant="tertiary" className="aspect-square" onClick={onUploadFolderButtonClicked}>
          <div className="h-6 w-6">
            <img src={FolderSimpleArrowUp} className="h-6 w-6" alt="" />
          </div>
        </Button>
        <TooltipElement id="uploadFolder-tooltip" delayShow={DELAY_SHOW_MS} />
      </div>
      <div
        className="flex items-center justify-center"
        data-tooltip-id="createfolder-tooltip"
        data-tooltip-content={translate('actions.upload.folder')}
        data-tooltip-place="bottom"
      >
        <Button variant="tertiary" className="aspect-square" onClick={onCreateFolderButtonClicked}>
          <FolderSimplePlus className="h-6 w-6" />
        </Button>
        <TooltipElement id="createfolder-tooltip" delayShow={DELAY_SHOW_MS} />
      </div>
    </div>
  );

  const driveExplorer = (
    <div
      className="flex h-full flex-grow flex-col"
      data-test="drag-and-drop-area"
      onContextMenu={isListElementsHovered ? () => null : handleContextMenuClick}
    >
      <DeleteItemsDialog onItemsDeleted={onItemsDeleted} />
      <CreateFolderDialog onFolderCreated={onFolderCreated} currentFolderId={currentFolderId} />
      <NameCollisionContainer />
      <MoveItemsDialog items={[...items]} onItemsMoved={onItemsMoved} isTrash={isTrash} />
      <ClearTrashDialog onItemsDeleted={onItemsDeleted} />
      <EditFolderNameDialog />
      <UploadItemsFailsDialog />
      <MenuItemToGetSize />
      {plan.subscription?.type === 'free' && !localStorageService.get('showLifetimeBanner') && <BannerWrapper />}

      <div className="z-0 flex h-full w-full max-w-full flex-grow">
        <div className="flex w-1 flex-grow flex-col">
          <div className="z-10 flex h-14 max-w-full flex-shrink-0 justify-between px-5">
            <div className={`mr-20 flex w-full min-w-0 flex-1 flex-row items-center text-lg ${titleClassName || ''}`}>
              {title}
            </div>

            {!isTrash && (
              <div className="flex flex-shrink-0 flex-row">
                <div className="flex items-center justify-center">
                  <Menu as="div" className={openedWithRightClick ? '' : 'relative'}>
                    {({ open, close }) => {
                      useEffect(() => {
                        if (!open) {
                          setOpenedWithRightClick(false);
                          setPosX(0);
                          setPosY(0);
                        }
                      }, [open]);

                      return (
                        <>
                          <Menu.Button ref={menuButtonRef as LegacyRef<HTMLButtonElement>}>
                            <Button variant="primary" className="hidden">
                              <div className="flex items-center justify-center space-x-2.5">
                                <span className="font-medium">{translate('actions.upload.new')}</span>
                                <div className="flex items-center space-x-0.5">
                                  <Plus weight="bold" className="h-4 w-4" />
                                  <CaretDown weight="fill" className="h-3 w-3" />
                                </div>
                              </div>
                            </Button>
                          </Menu.Button>
                          <Transition
                            className="absolute"
                            enter="transform transition origin-top-right duration-100 ease-out"
                            enterFrom="scale-95 opacity-0"
                            enterTo="scale-100 opacity-100"
                            leave="transform transition origin-top-right duration-100 ease-out"
                            leaveFrom="scale-95 opacity-100"
                            leaveTo="scale-100 opacity-0"
                            style={
                              openedWithRightClick ? { top: posY, left: posX, zIndex: 99 } : { right: 0, zIndex: 99 }
                            }
                          >
                            {open && (
                              <Menu.Items
                                className={
                                  'outline-none mt-1 rounded-md border border-black border-opacity-8 bg-white py-1.5 text-base shadow-subtle-hard'
                                }
                              >
                                <Menu.Item>
                                  {({ active }) => {
                                    useHotkeys('shift+F', () => {
                                      if (open) {
                                        close();
                                        onCreateFolderButtonClicked();
                                      }
                                    });

                                    return (
                                      <div
                                        onClick={onCreateFolderButtonClicked}
                                        className={`${
                                          active && 'bg-gray-5'
                                        } flex cursor-pointer items-center space-x-3 whitespace-nowrap py-2 pl-3 pr-5 text-gray-80 hover:bg-gray-5`}
                                      >
                                        <FolderSimplePlus size={20} />
                                        <p>{translate('actions.upload.folder')}</p>
                                        <span className="ml-5 flex flex-grow items-center justify-end text-sm text-gray-40">
                                          <ArrowFatUp size={14} /> F
                                        </span>
                                      </div>
                                    );
                                  }}
                                </Menu.Item>
                                <div className="my-px mx-3 flex border-t border-gray-5" />
                                <Menu.Item>
                                  {({ active }) => (
                                    <div
                                      onClick={onUploadFileButtonClicked}
                                      className={`${
                                        active && 'bg-gray-5'
                                      } flex cursor-pointer items-center space-x-3 whitespace-nowrap py-2 pl-3 pr-5 text-gray-80 hover:bg-gray-5`}
                                    >
                                      <FileArrowUp size={20} />
                                      <p className="ml-3">{translate('actions.upload.uploadFiles')}</p>
                                    </div>
                                  )}
                                </Menu.Item>
                                <Menu.Item>
                                  {({ active }) => (
                                    <div
                                      onClick={onUploadFolderButtonClicked}
                                      className={`${
                                        active && 'bg-gray-5'
                                      } flex cursor-pointer items-center space-x-3 whitespace-nowrap py-2 pl-3 pr-5 text-gray-80 hover:bg-gray-5`}
                                    >
                                      <UploadSimple size={20} />
                                      <p className="ml-3">{translate('actions.upload.uploadFolder')}</p>
                                    </div>
                                  )}
                                </Menu.Item>
                              </Menu.Items>
                            )}
                          </Transition>
                        </>
                      );
                    }}
                  </Menu>
                </div>
                {!isTrash && <DriveTopBarItems />}
                {hasAnyItemSelected && (
                  <>
                    {separatorV}
                    <div className="flex items-center justify-center">
                      <div
                        className="flex items-center justify-center"
                        data-tooltip-id="download-tooltip"
                        data-tooltip-content={translate('drive.dropdown.download')}
                        data-tooltip-place="bottom"
                      >
                        <Button variant="tertiary" className="aspect-square" onClick={onDownloadButtonClicked}>
                          <DownloadSimple className="h-6 w-6" />
                        </Button>
                        <TooltipElement id="download-tooltip" delayShow={DELAY_SHOW_MS} />
                      </div>

                      {selectedItems.length === 1 && (
                        <>
                          {isSelectedItemShared && (
                            <div
                              className="flex items-center justify-center"
                              data-tooltip-id="linkSettings-tooltip"
                              data-tooltip-content={translate('drive.dropdown.linkSettings')}
                              data-tooltip-place="bottom"
                            >
                              <Button variant="tertiary" className="aspect-square" onClick={onSelectedOneItemShare}>
                                <Link className="h-6 w-6" />
                              </Button>
                              <TooltipElement id="linkSettings-tooltip" delayShow={DELAY_SHOW_MS} />
                            </div>
                          )}
                          <div
                            className="flex items-center justify-center"
                            data-tooltip-id="rename-tooltip"
                            data-tooltip-content={translate('drive.dropdown.rename')}
                            data-tooltip-place="bottom"
                          >
                            <Button variant="tertiary" className="aspect-square" onClick={onSelectedOneItemRename}>
                              <PencilSimple className="h-6 w-6" />
                            </Button>
                            <TooltipElement id="rename-tooltip" delayShow={DELAY_SHOW_MS} />
                          </div>
                        </>
                      )}
                      <div
                        className="flex items-center justify-center"
                        data-tooltip-id="trash-tooltip"
                        data-tooltip-content={translate('drive.dropdown.moveToTrash')}
                        data-tooltip-place="bottom"
                      >
                        <Button variant="tertiary" className="aspect-square" onClick={onBulkDeleteButtonClicked}>
                          <Trash className="h-6 w-6" />
                        </Button>
                        <TooltipElement id="trash-tooltip" delayShow={DELAY_SHOW_MS} />
                      </div>
                    </div>
                  </>
                )}
                {separatorV}
                <div className="flex items-center justify-center">
                  <Button variant="tertiary" className="aspect-square" onClick={onViewModeButtonClicked}>
                    {viewModesIcons[viewMode]}
                  </Button>
                  <TooltipElement id="viewMode-tooltip" delayShow={DELAY_SHOW_MS} />
                </div>
              </div>
            )}
            {isTrash && (
              <div className="flex items-center justify-center">
                <Menu as="div" className={openedWithRightClick ? '' : 'relative'}>
                  {({ open }) => {
                    useEffect(() => {
                      if (!open) {
                        setOpenedWithRightClick(false);
                        setPosX(0);
                        setPosY(0);
                      }
                    }, [open]);

                    return (
                      <>
                        <Menu.Button ref={menuButtonRef as LegacyRef<HTMLButtonElement>}></Menu.Button>
                        <Transition
                          className="absolute"
                          enter="transform transition origin-top-right duration-100 ease-out"
                          enterFrom="scale-95 opacity-0"
                          enterTo="scale-100 opacity-100"
                          leave="transform transition origin-top-right duration-100 ease-out"
                          leaveFrom="scale-95 opacity-100"
                          leaveTo="scale-100 opacity-0"
                          style={
                            openedWithRightClick ? { top: posY, left: posX, zIndex: 99 } : { right: 0, zIndex: 99 }
                          }
                        >
                          {open && (
                            <Menu.Items
                              className={
                                'outline-none mt-1 rounded-md border border-black border-opacity-8 bg-white py-1.5 text-base shadow-subtle-hard'
                              }
                            >
                              <Menu.Item>
                                {({ active }) => (
                                  <div
                                    onClick={onDeletePermanentlyButtonClicked}
                                    className={`${
                                      active && 'bg-gray-5'
                                    } flex cursor-pointer items-center space-x-3 whitespace-nowrap py-2 pl-3 pr-5 text-gray-80 hover:bg-gray-5`}
                                  >
                                    <Trash size={20} />
                                    <p>{translate('drive.clearTrash.accept')}</p>
                                  </div>
                                )}
                              </Menu.Item>
                            </Menu.Items>
                          )}
                        </Transition>
                      </>
                    );
                  }}
                </Menu>
              </div>
            )}
            {isTrash && hasAnyItemSelected && (
              <div
                className="flex items-center justify-center"
                data-tooltip-id="restore-tooltip"
                data-tooltip-content={translate('trash.item-menu.restore')}
                data-tooltip-place="bottom"
              >
                <Button variant="tertiary" className="aspect-square" onClick={onRecoverButtonClicked}>
                  <ClockCounterClockwise className="h-6 w-6" />
                </Button>
                <TooltipElement id="restore-tooltip" delayShow={DELAY_SHOW_MS} />
              </div>
            )}
            {isTrash && (
              <div
                className="flex items-center justify-center"
                data-tooltip-id="delete-permanently-tooltip"
                data-tooltip-content={translate('trash.item-menu.delete-permanently')}
                data-tooltip-place="bottom"
              >
                <Button
                  variant="tertiary"
                  className="aspect-square"
                  disabled={!hasItems}
                  onClick={onDeletePermanentlyButtonClicked}
                >
                  <Trash className="h-5 w-5" />
                </Button>
                <TooltipElement id="delete-permanently-tooltip" delayShow={DELAY_SHOW_MS} />
              </div>
            )}
          </div>

          <div className="z-0 flex h-full flex-grow flex-col justify-between overflow-y-hidden">
            {hasItems && (
              <div className="flex flex-grow flex-col justify-between overflow-hidden">
                <ViewModeComponent
                  folderId={currentFolderId}
                  items={isTrash ? paginatedTrashItems : itemsList}
                  isLoading={isLoading}
                  onEndOfScroll={isTrash ? getMoreTrashItems : getMoreItems}
                  hasMoreItems={hasMoreItems}
                  isTrash={isTrash}
                  onHoverListItems={(areHovered) => setIsListElementsHovered(areHovered)}
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

  if (countTotalItemsToUpload < UPLOAD_ITEMS_LIMIT) {
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
    folderOnTrashLength: state.storage.folderOnTrashLength,
    filesOnTrashLength: state.storage.filesOnTrashLength,
  };
})(DropTarget([NativeTypes.FILE], dropTargetSpec, dropTargetCollect)(DriveExplorer));
