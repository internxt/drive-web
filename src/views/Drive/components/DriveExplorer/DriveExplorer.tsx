import { useCallback, useEffect } from 'react';
import { useTutorialState } from '../../hooks';
import { useDriveExplorerContextMenu } from './hooks/useDriveExplorerContextMenu';
import { useDriveExplorerDrop } from './hooks/useDriveExplorerDrop';
import { useEditItemName } from './hooks/useEditItemName';
import { useDriveExplorerItems } from './hooks/useDriveExplorerItems';
import { useDriveExplorerUpload } from './hooks/useDriveExplorerUpload';
import { useRefreshDriveExplorerItems } from './hooks/useRefreshDriveExplorerItems';
import { useStopSharingAndTrash } from './hooks/useStopSharingAndTrash';

import { RootState } from 'app/store';
import { DriveExplorerEmptyState, DriveExplorerGrid, DriveExplorerList, DriveTopBarActions } from './components';
import DriveExplorerContextMenu from './components/DriveExplorerContextMenu';
import DriveExplorerDialogs from './components/DriveExplorerDialogs';
import UploadInputs from './components/UploadInputs';

import BannerWrapper from 'app/banners/BannerWrapper';
import deviceService from 'services/device.service';
import navigationService from 'services/navigation.service';
import { Tutorial } from 'components/Tutorial';
import { getSignUpSteps } from 'components/signUpSteps';
import { useAppDispatch, useAppSelector } from 'app/store/hooks';
import { storageActions } from 'app/store/slices/storage';
import storageSelectors from 'app/store/slices/storage/storage.selectors';
import { useCreateFolderHotkey, useToggleFavoriteHotkey } from 'hooks';
import { uiActions } from 'app/store/slices/ui';
import { DriveItemData, FileViewMode } from 'app/drive/types';
import WarningMessageWrapper from 'views/Home/components/WarningMessageWrapper';
import './DriveExplorer.scss';
import { DriveTopBarItems } from './DriveTopBarItems';
import { AppView } from 'app/core/types';

interface DriveExplorerProps {
  title: JSX.Element | string;
  titleClassName?: string;
  isLoading: boolean;
  items: DriveItemData[];
  fetchFolderContent?: () => void;
  onFolderCreated?: () => void;
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

const DriveExplorer = ({
  title,
  titleClassName,
  isLoading,
  items,
  fetchFolderContent,
  onFolderCreated,
  getTrashPaginated,
}: DriveExplorerProps): JSX.Element => {
  const dispatch = useAppDispatch();
  const currentFolderId = useAppSelector(storageSelectors.currentFolderId);
  const selectedItems = useAppSelector((state: RootState) => state.storage.selectedItems);
  const storageFilters = useAppSelector((state: RootState) => state.storage.filters);
  const viewMode = useAppSelector((state: RootState) => state.storage.viewMode);

  const hasItems = items.length > 0;
  const hasFilters = storageFilters.text.length > 0;
  const hasAnyItemSelected = selectedItems.length > 0;

  const isRecents = navigationService.isCurrentPath(AppView.Recents);
  const isFavorites = navigationService.isCurrentPath(AppView.Favorites);
  const isTrash = navigationService.isCurrentPath(AppView.Trash);
  const isDrive = !isRecents && !isFavorites && !isTrash;

  const {
    fileInputRef,
    folderInputRef,
    onUploadFileButtonClicked,
    onUploadFolderButtonClicked,
    onFileInputChanged,
    onFolderInputChanged,
    uploadItems,
  } = useDriveExplorerUpload(currentFolderId);
  const { isOver, dropRef } = useDriveExplorerDrop(uploadItems);

  const contextMenu = useDriveExplorerContextMenu();

  const {
    hasMoreItemsToLoad,
    isEmptyFolder,
    isLoadingTrashItems,
    loadMoreItems,
    resetPaginationState,
    onTrashCleared,
  } = useDriveExplorerItems({ isTrash, isFavorites, isRecents, isLoading, getTrashPaginated });
  const tutorialState = useTutorialState();

  const isSomeStoreDialogOpen = useAppSelector(
    (state: RootState) =>
      state.ui.isShareDialogOpen ||
      state.ui.isShareItemDialogOpen ||
      state.ui.isShareWhithTeamDialogOpen ||
      state.ui.isInvitationsDialogOpen ||
      state.ui.isEditFolderNameDialog ||
      state.ui.isFileViewerOpen ||
      state.ui.isMoveItemsDialogOpen ||
      state.ui.isCreateFolderDialogOpen ||
      state.ui.isDeleteItemsDialogOpen ||
      state.ui.isClearTrashDialogOpen ||
      state.ui.isAutomaticTrashDisposalDialogOpen ||
      state.ui.isNameCollisionDialogOpen ||
      state.ui.isUploadItemsFailsDialogOpen ||
      state.ui.isReachedPlanLimitDialogOpen ||
      state.ui.isReachedFileSizeLimitDialogOpen ||
      state.ui.isUpgradePlanDialogOpen ||
      state.ui.isItemDetailsDialogOpen ||
      state.ui.isDeleteVersionDialogOpen ||
      state.ui.isRestoreVersionDialogOpen ||
      state.ui.isPreferencesDialogOpen,
  );

  const { refreshItems, refreshItemsAfterChange } = useRefreshDriveExplorerItems(fetchFolderContent);
  const { editNameItem, setEditNameItem, onEditNameClose } = useEditItemName();
  const stopSharingAndTrash = useStopSharingAndTrash(refreshItemsAfterChange);
  const isSomeDialogOpen = isSomeStoreDialogOpen || stopSharingAndTrash.isStopSharingConfirmationOpen;

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

  useEffect(() => {
    deviceService.redirectForMobile();
  }, []);

  const onCreateFolderButtonClicked = useCallback((): void => {
    dispatch(uiActions.setIsCreateFolderDialogOpen(true));
  }, [dispatch]);

  const onDeletePermanentlyButtonClicked = (): void => {
    if (selectedItems.length > 0) {
      dispatch(storageActions.setItemsToDelete(selectedItems));
      dispatch(uiActions.setIsDeleteItemsDialogOpen(true));
    } else {
      dispatch(uiActions.setIsClearTrashDialogOpen(true));
    }
  };

  const viewModes = {
    [FileViewMode.List]: DriveExplorerList,
    [FileViewMode.Grid]: DriveExplorerGrid,
  };

  const ViewModeComponent = viewModes[isTrash ? FileViewMode.List : viewMode];

  useToggleFavoriteHotkey({ enabled: !isTrash && !isSomeDialogOpen, selectedItems });

  const onCreateFolderHotkeyPressed = useCallback((): void => {
    contextMenu.closeContextMenu();
    onCreateFolderButtonClicked();
  }, [contextMenu.closeContextMenu, onCreateFolderButtonClicked]);

  useCreateFolderHotkey({
    enabled: isDrive && !isSomeDialogOpen,
    onCreateFolder: onCreateFolderHotkeyPressed,
  });

  const driveExplorer = (
    <div
      role="none"
      className="flex h-full grow flex-col"
      data-test="drag-and-drop-area"
      onContextMenu={contextMenu.onContainerContextMenu}
      onClick={contextMenu.closeContextMenu}
      ref={contextMenu.containerRef}
    >
      <DriveExplorerDialogs
        isTrash={isTrash}
        items={items}
        editNameItem={editNameItem}
        isStopSharingConfirmationOpen={stopSharingAndTrash.isStopSharingConfirmationOpen}
        onFolderCreated={onFolderCreated}
        onTrashCleared={onTrashCleared}
        refreshItems={refreshItems}
        refreshItemsAfterChange={refreshItemsAfterChange}
        onEditNameClose={onEditNameClose}
        onStopSharingConfirmationClose={stopSharingAndTrash.closeStopSharingConfirmation}
        moveItemsToTrashOnStopSharing={stopSharingAndTrash.moveItemsToTrashOnStopSharing}
      />
      <BannerWrapper />

      <div className="flex h-full w-full max-w-full grow">
        <DriveExplorerContextMenu
          isTrash={isTrash}
          isFavorites={isFavorites}
          isRecents={isRecents}
          isOpen={contextMenu.isOpen}
          position={contextMenu.position}
          menuRef={contextMenu.menuRef}
          onClose={contextMenu.closeContextMenu}
          onCreateFolderButtonClicked={onCreateFolderButtonClicked}
          onUploadFileButtonClicked={onUploadFileButtonClicked}
          onUploadFolderButtonClicked={onUploadFolderButtonClicked}
          onClearTrashButtonClicked={onDeletePermanentlyButtonClicked}
        />
        <div className="flex w-1 grow flex-col">
          <div className="z-10 flex flex-wrap min-h-14 max-w-full shrink-0 justify-between px-5 py-2 ">
            <div
              className={`mr-20 ${isTrash ? 'min-w-0' : 'min-w-[200px]'} flex w-full z-20 flex-1 flex-row flex-wrap items-center text-lg ${titleClassName ?? ''}`}
            >
              {title}
            </div>
            {/* Upload and new folder actions, only for Drive */}
            {isDrive && (
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

          <div className="flex h-full grow flex-col justify-between overflow-y-hidden">
            <WarningMessageWrapper />

            <div className="flex grow flex-col justify-between overflow-hidden">
              <ViewModeComponent
                folderId={currentFolderId}
                items={items}
                isLoading={isTrash ? isLoadingTrashItems : isLoading}
                onEndOfScroll={loadMoreItems}
                hasMoreItems={hasMoreItemsToLoad}
                isTrash={isTrash}
                isRecents={isRecents}
                isFavorites={isFavorites}
                onHoverListItems={contextMenu.setAreItemsHovered}
                onOpenStopSharingAndMoveToTrashDialog={stopSharingAndTrash.openStopSharingConfirmation}
                showStopSharingConfirmation={stopSharingAndTrash.isStopSharingConfirmationOpen}
                resetPaginationState={resetPaginationState}
              />
            </div>
            {
              /* EMPTY FOLDER */
              !hasItems && isEmptyFolder && !isLoadingTrashItems && (
                <DriveExplorerEmptyState
                  hasFilters={hasFilters}
                  isTrash={isTrash}
                  isRecents={isRecents}
                  isFavorites={isFavorites}
                  onUploadFileButtonClicked={onUploadFileButtonClicked}
                  onContextMenu={contextMenu.openContextMenu}
                />
              )
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
            <UploadInputs
              fileInputRef={fileInputRef}
              folderInputRef={folderInputRef}
              onFileInputChanged={onFileInputChanged}
              onFolderInputChanged={onFolderInputChanged}
            />
          )}
        </div>
      </div>
    </div>
  );

  if (isTrash || isFavorites) {
    return driveExplorer;
  }

  return (
    <Tutorial
      show={isDrive && tutorialState.showTutorial}
      steps={signupSteps}
      currentStep={tutorialState.currentTutorialStep}
    >
      {dropRef(driveExplorer) || driveExplorer}
    </Tutorial>
  );
};

export default DriveExplorer;
