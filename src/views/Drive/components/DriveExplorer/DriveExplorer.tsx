import { useCallback, useEffect, useState } from 'react';
import { useTutorialState } from '../../hooks';
import { useDriveExplorerContextMenu } from './hooks/useDriveExplorerContextMenu';
import { useDriveExplorerDrop } from './hooks/useDriveExplorerDrop';
import { useDriveExplorerItems } from './hooks/useDriveExplorerItems';
import { useDriveExplorerUpload } from './hooks/useDriveExplorerUpload';

import { RootState } from 'app/store';
import { DriveExplorerEmptyState, DriveExplorerGrid, DriveExplorerList, DriveTopBarActions } from './components';
import DriveExplorerContextMenu from './components/DriveExplorerContextMenu';
import UploadInputs from './components/UploadInputs';

import { moveItemsToTrash } from 'views/Trash/services';

import BannerWrapper from 'app/banners/BannerWrapper';
import deviceService from 'services/device.service';
import navigationService from 'services/navigation.service';
import { ClearTrashDialog } from 'views/Trash/components';
import { CreateFolderDialog } from 'views/Drive/components';
import DeleteItemsDialog from 'views/Trash/components/DeleteItemsDialog';
import { AdvancedSharedItem } from 'app/share/types';
import { Tutorial } from 'components/Tutorial';
import { getSignUpSteps } from 'components/signUpSteps';
import { useAppDispatch, useAppSelector } from 'app/store/hooks';
import { storageActions } from 'app/store/slices/storage';
import storageSelectors from 'app/store/slices/storage/storage.selectors';
import { useToggleFavoriteHotkey } from 'hooks';
import { fetchSortedFolderContentThunk } from 'app/store/slices/storage/storage.thunks/fetchSortedFolderContentThunk';
import { getAncestorsAndSetNamePath } from 'app/store/slices/storage/storage.thunks/goToFolderThunk';
import { uiActions } from 'app/store/slices/ui';
import workspacesSelectors from 'app/store/slices/workspaces/workspaces.selectors';
import { DriveItemData, FileViewMode } from 'app/drive/types';
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
  const selectedWorkspace = useAppSelector(workspacesSelectors.getSelectedWorkspace);

  const hasItems = items.length > 0;
  const hasFilters = storageFilters.text.length > 0;
  const hasAnyItemSelected = selectedItems.length > 0;

  const isRecents = navigationService.isCurrentPath(AppView.Recents);
  const isFavorites = navigationService.isCurrentPath(AppView.Favorites);
  const isTrash = navigationService.isCurrentPath(AppView.Trash);

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

  const itemToRename = useAppSelector((state: RootState) => state.storage.itemToRename);
  const isSomeDialogOpen = useAppSelector(
    (state: RootState) =>
      state.ui.isShareDialogOpen ||
      state.ui.isEditFolderNameDialog ||
      state.ui.isFileViewerOpen ||
      state.ui.isMoveItemsDialogOpen ||
      state.ui.isCreateFolderDialogOpen ||
      state.ui.isNameCollisionDialogOpen ||
      state.ui.isReachedPlanLimitDialogOpen ||
      state.ui.isItemDetailsDialogOpen ||
      state.ui.isPreferencesDialogOpen,
  );
  const isFileViewerOpen = useAppSelector((state: RootState) => state.ui.isFileViewerOpen);

  const [editNameItem, setEditNameItem] = useState<DriveItemData | null>(null);

  const [showStopSharingConfirmation, setShowStopSharingConfirmation] = useState(false);

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
    if (itemToRename) {
      setEditNameItem(itemToRename);
    }
  }, [itemToRename]);

  useEffect(() => {
    deviceService.redirectForMobile();
  }, []);

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
        getAncestorsAndSetNamePath(newItem.uuid, dispatch, selectedWorkspace);
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

  useToggleFavoriteHotkey({ enabled: !isTrash && !isSomeDialogOpen, selectedItems });

  const driveExplorer = (
    <div
      role="none"
      className="flex h-full grow flex-col"
      data-test="drag-and-drop-area"
      onContextMenu={contextMenu.onContainerContextMenu}
      onClick={contextMenu.closeContextMenu}
      ref={contextMenu.containerRef}
    >
      <DeleteItemsDialog />
      <CreateFolderDialog onFolderCreated={onFolderCreated} currentFolderId={currentFolderId} />
      <ShareDialogWrapper isDriveItem onShareItem={handleOnShareItem} />
      <NameCollisionContainer />
      <MoveItemsDialog
        items={[...items]}
        onItemsMoved={() => {
          dispatch(fetchSortedFolderContentThunk(currentFolderId));
        }}
        isTrash={isTrash}
      />
      <ClearTrashDialog onItemsDeleted={onTrashCleared} />
      <UploadItemsFailsDialog />
      <ItemDetailsDialog onDetailsButtonClicked={onDetailsButtonClicked} isTrash={isTrash} />
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
        <DriveExplorerContextMenu
          isTrash={isTrash}
          isFavorites={isFavorites}
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
            {/* General Dropdown for Drive Explorer/Trash */}
            {!isTrash && !isFavorites && (
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
                onOpenStopSharingAndMoveToTrashDialog={onOpenStopSharingAndMoveToTrashDialog}
                showStopSharingConfirmation={showStopSharingConfirmation}
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
    <Tutorial show={tutorialState.showTutorial} steps={signupSteps} currentStep={tutorialState.currentTutorialStep}>
      {dropRef(driveExplorer) || driveExplorer}
    </Tutorial>
  );
};

export default DriveExplorer;
