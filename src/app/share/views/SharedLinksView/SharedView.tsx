import _ from 'lodash';
import { connect, useSelector } from 'react-redux';
import { useHistory } from 'react-router-dom';

import { ChangeEvent, useEffect, useLayoutEffect, useRef } from 'react';
import localStorageService from '../../../core/services/local-storage.service';
import { DriveItemData } from '../../../drive/types';
import { useTranslationContext } from '../../../i18n/provider/TranslationProvider';
import notificationsService, { ToastType } from '../../../notifications/services/notifications.service';
import shareService, { decryptMnemonic } from '../../../share/services/share.service';
import DeleteDialog from '../../../shared/components/Dialog/Dialog';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { storageActions } from '../../../store/slices/storage';
import { uiActions } from '../../../store/slices/ui';

import BreadcrumbsSharedView from 'app/shared/components/Breadcrumbs/Containers/BreadcrumbsSharedView';
import { DropTargetMonitor, useDrop } from 'react-dnd';
import { NativeTypes } from 'react-dnd-html5-backend';
import { Helmet } from 'react-helmet-async';
import moveItemsToTrash from '../../../../use_cases/trash/move-items-to-trash';
import errorService from '../../../core/services/error.service';
import { UPLOAD_ITEMS_LIMIT } from '../../../drive/components/DriveExplorer/DriveExplorer';
import EditItemNameDialog from '../../../drive/components/EditItemNameDialog/EditItemNameDialog';
import FileViewerWrapper from '../../../drive/components/FileViewer/FileViewerWrapper';
import ItemDetailsDialog from '../../../drive/components/ItemDetailsDialog/ItemDetailsDialog';
import MoveItemsDialog from '../../../drive/components/MoveItemsDialog/MoveItemsDialog';
import NameCollisionContainer from '../../../drive/components/NameCollisionDialog/NameCollisionContainer';
import ShareDialog from '../../../drive/components/ShareDialog/ShareDialog';
import ShowInvitationsDialog from '../../../drive/components/ShowInvitationsDialog/ShowInvitationsDialog';
import StopSharingAndMoveToTrashDialogWrapper from '../../../drive/components/StopSharingAndMoveToTrashDialogWrapper/StopSharingAndMoveToTrashDialogWrapper';
import WarningMessageWrapper from '../../../drive/components/WarningMessage/WarningMessageWrapper';
import { AdvancedSharedItem, PreviewFileItem, SharedNamePath } from '../../../share/types';
import { RootState } from '../../../store';
import { sharedActions, sharedThunks } from '../../../store/slices/sharedLinks';
import storageThunks from '../../../store/slices/storage/storage.thunks';
import workspacesSelectors from '../../../store/slices/workspaces/workspaces.selectors';
import { handlePrivateSharedFolderAccess } from '../../services/redirections.service';
import TopBarButtons from './components/TopBarButtons';
import SharedItemListContainer from './containers/SharedItemListContainer';
import {
  setClickedShareItemEncryptionKey,
  setClickedShareItemUser,
  setCurrentFolderId,
  setCurrentFolderLevelResourcesToken,
  setCurrentParentFolderId,
  setCurrentShareOwnerAvatar,
  setEditNameItem,
  setHasMoreFiles,
  setHasMoreFolders,
  setIsDeleteDialogModalOpen,
  setIsEditNameDialogOpen,
  setIsFileViewerOpen,
  setIsLoading,
  setItemToView,
  setNextFolderLevelResourcesToken,
  setPage,
  setSelectedItems,
  setSharedFiles,
  setSharedFolders,
  setShowStopSharingConfirmation,
} from './context/SharedViewContext.actions';
import { useShareViewContext } from './context/SharedViewContextProvider';
import useFetchSharedData from './hooks/useFetchSharedData';
import {
  getDraggedItemsWithoutFolders,
  getFolderUserRole,
  isCurrentUserViewer,
  isItemOwnedByCurrentUser,
} from './sharedViewUtils';

export const MAX_SHARED_NAME_LENGTH = 32;

interface SharedViewProps {
  isShareDialogOpen: boolean;
  isShowInvitationsOpen: boolean;
  sharedNamePath: SharedNamePath[];
  currentShareId: string | null;
  currentUserRole: string | null;
  disableKeyboardShortcuts: boolean;
}

function SharedView({
  isShareDialogOpen,
  isShowInvitationsOpen,
  sharedNamePath,
  currentShareId,
  currentUserRole,
  disableKeyboardShortcuts,
}: Readonly<SharedViewProps>): JSX.Element {
  const { translate } = useTranslationContext();
  const dispatch = useAppDispatch();
  const history = useHistory();

  const currentUser = localStorageService.getUser();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const urlParams = new URLSearchParams(window.location.search);
  const folderUUID = urlParams.get('folderuuid');

  const isRootFolder = sharedNamePath.length === 0;
  const pendingInvitations = useAppSelector((state: RootState) => state.shared.pendingInvitations);

  const { state, actionDispatch } = useShareViewContext();
  const {
    page,
    isLoading,
    shareFolders,
    shareFiles,
    selectedItems,
    itemToView,
    editNameItem,
    showStopSharingConfirmation,
    isFileViewerOpen,
    isEditNameDialogOpen,
    isDeleteDialogModalOpen,
    currentFolderLevelResourcesToken,
    nextFolderLevelResourcesToken,
    clickedShareItemUser,
    clickedShareItemEncryptionKey,
    currentFolderId,
    currentParentFolderId,
    filesOwnerCredentials,
    ownerBucket,
    ownerEncryptionKey,
  } = state;

  const shareItems = [...shareFolders, ...shareFiles];
  const { fetchRootFolders, fetchFiles } = useFetchSharedData();

  const selectedWorkspace = useSelector(workspacesSelectors.getSelectedWorkspace);
  const workspaceId = selectedWorkspace?.workspace.id;
  const defaultTeamId = selectedWorkspace?.workspace.defaultTeamId;

  useLayoutEffect(() => {
    dispatch(sharedThunks.getPendingInvitations());

    if (page === 0 && !folderUUID) {
      fetchRootFolders(workspaceId);
      dispatch(storageActions.resetSharedNamePath());
    }

    if (folderUUID) {
      const onRedirectionToFolderError = (errorMessage: string) => {
        notificationsService.show({ text: errorMessage, type: ToastType.Error });
        fetchRootFolders(workspaceId);
      };

      handlePrivateSharedFolderAccess({
        folderUUID,
        navigateToFolder: handleOnItemDoubleClick,
        history,
        onError: onRedirectionToFolderError,
        workspaceItemData: { workspaceId, teamId: defaultTeamId },
      });
    }
  }, []);

  useEffect(() => {
    if (currentShareId) {
      getFolderUserRole({
        sharingId: currentShareId,
        onObtainUserRoleCallback: (roleName) => dispatch(sharedActions.setCurrentSharingRole(roleName)),
      });
    } else {
      resetCurrentSharingStatus();
    }
  }, [currentShareId]);

  const onItemDropped = async (_, monitor: DropTargetMonitor) => {
    const droppedData: any = monitor.getItem() || [];
    const itemsArray: DataTransferItem[] = Array.from(droppedData.dataTransfer.items);

    const { filteredItems, hasFolders } = await getDraggedItemsWithoutFolders(itemsArray);

    if (hasFolders) {
      notificationsService.show({
        text: translate('notificationMessages.foldersCannotBeUploadedToSharedFolder'),
        type: ToastType.Info,
      });
    }

    const transformedObject: FileList = filteredItems.reduce((acc: any, file, index) => {
      acc[index] = file;
      return acc;
    }, {});

    await onUploadFileInputChanged({
      files: {
        ...transformedObject,
        length: filteredItems.length,
      },
    });
  };

  const [{ isOver, canDrop }, drop] = useDrop(
    () => ({
      accept: [NativeTypes.FILE],
      collect: (monitor) => ({
        isOver: monitor.isOver(),
        canDrop: monitor.canDrop(),
      }),
      canDrop: (_, monitor): boolean => {
        const droppedType = monitor.getItemType();
        const canDrop = droppedType === NativeTypes.FILE && !isRootFolder && !isCurrentUserViewer(currentUserRole);

        return canDrop;
      },
      drop: onItemDropped,
    }),
    [
      selectedItems,
      ownerEncryptionKey,
      filesOwnerCredentials,
      ownerBucket,
      currentFolderId,
      currentFolderLevelResourcesToken,
      nextFolderLevelResourcesToken,
      sharedNamePath,
    ],
  );

  const resetSharedItems = () => {
    actionDispatch(setSharedFolders([]));
    actionDispatch(setSharedFiles([]));
  };

  const resetSharedViewState = () => {
    actionDispatch(setPage(0));
    resetSharedItems();
    actionDispatch(setHasMoreFolders(true));
    actionDispatch(setHasMoreFiles(true));
  };

  const resetCurrentSharingStatus = () => {
    dispatch(sharedActions.setCurrentShareId(null));
    dispatch(sharedActions.setCurrentSharingRole(null));
  };

  const onShowInvitationsModalClose = () => {
    resetSharedViewState();
    actionDispatch(setCurrentFolderId(''));
    fetchRootFolders(workspaceId);
    dispatch(sharedThunks.getPendingInvitations());
    dispatch(uiActions.setIsInvitationsDialogOpen(false));
  };

  const handleOnItemDoubleClick = (shareItem: AdvancedSharedItem) => {
    if (!isLoading)
      if (shareItem.isFolder) {
        dispatch(
          storageActions.pushSharedNamePath({
            id: shareItem.id,
            name: shareItem.plainName,
            token: nextFolderLevelResourcesToken,
            uuid: shareItem.uuid,
          }),
        );

        const sharedFolderId = shareItem.uuid;

        if (shareItem.user) {
          actionDispatch(setClickedShareItemUser(shareItem.user));
        }

        if (shareItem.encryptionKey) {
          actionDispatch(setClickedShareItemEncryptionKey(shareItem.encryptionKey));
        }

        actionDispatch(setCurrentFolderLevelResourcesToken(nextFolderLevelResourcesToken));
        actionDispatch(setNextFolderLevelResourcesToken(''));
        actionDispatch(setPage(0));
        resetSharedItems();
        actionDispatch(setHasMoreFolders(true));
        actionDispatch(setHasMoreFiles(true));
        actionDispatch(setCurrentFolderId(sharedFolderId));
        actionDispatch(setCurrentParentFolderId(shareItem.uuid));
        actionDispatch(setCurrentShareOwnerAvatar(shareItem?.user?.avatar ?? ''));
        actionDispatch(setSelectedItems([]));
      } else {
        openPreview(shareItem);
      }
  };

  const closeConfirmDelete = () => {
    actionDispatch(setIsDeleteDialogModalOpen(false));
  };

  const deleteShareLink = async (shareId: string) => {
    return await shareService.deleteShareLink(shareId);
  };

  const onDeleteSelectedItems = async () => {
    const hasSelectedItems = selectedItems.length > 0;

    if (hasSelectedItems) {
      actionDispatch(setIsLoading(true));

      const CHUNK_SIZE = 10;
      const chunks = _.chunk(selectedItems, CHUNK_SIZE);
      for (const chunk of chunks) {
        const promises = chunk.map((item) => deleteShareLink(item.id?.toString()));
        await Promise.all(promises);
      }

      const stringLinksDeleted =
        selectedItems.length > 1
          ? translate('shared-links.toast.links-deleted')
          : translate('shared-links.toast.link-deleted');
      notificationsService.show({ text: stringLinksDeleted, type: ToastType.Success });
      closeConfirmDelete();
      actionDispatch(setSelectedItems([]));
      actionDispatch(setIsLoading(false));
    }
  };

  const removeItemsFromList = (itemsToRemove: DriveItemData[]) => {
    const selectedItemsIDs = new Set(itemsToRemove.map((selectedItem) => selectedItem.id));
    const newSharedFoldersList = shareFolders.filter((sharedItem) => !selectedItemsIDs.has(sharedItem.id));
    const newSharedFilesList = shareFiles.filter((sharedItem) => !selectedItemsIDs.has(sharedItem.id));

    actionDispatch(setSharedFolders(newSharedFoldersList));
    actionDispatch(setSharedFiles(newSharedFilesList));
  };

  const moveSelectedItemsToTrash = async (items: DriveItemData[]) => {
    const itemsToTrash = items.map((selectedShareItem) => ({
      ...selectedShareItem,
      isFolder: selectedShareItem.isFolder,
    }));

    await moveItemsToTrash(itemsToTrash, () => removeItemsFromList(itemsToTrash));

    actionDispatch(setSelectedItems([]));
  };

  const renameItem = (shareItem: AdvancedSharedItem | DriveItemData) => {
    actionDispatch(setEditNameItem(shareItem as DriveItemData));
    actionDispatch(setIsEditNameDialogOpen(true));
  };

  const openPreview = async (shareItem: AdvancedSharedItem) => {
    const previewItem = {
      ...(shareItem as unknown as PreviewFileItem),
      credentials: { user: shareItem.credentials.networkUser, pass: shareItem.credentials.networkPass },
    };

    try {
      const mnemonic =
        selectedWorkspace?.workspaceUser.key ??
        (await decryptMnemonic(shareItem.encryptionKey ? shareItem.encryptionKey : clickedShareItemEncryptionKey));
      handleOpenItemPreview(true, { ...previewItem, mnemonic });
    } catch (err) {
      const error = errorService.castError(err);
      errorService.reportError(error);
    }
  };

  const handleOpenItemPreview = (openItemPreview: boolean, item?: PreviewFileItem) => {
    actionDispatch(setItemToView(item));
    actionDispatch(setIsFileViewerOpen(openItemPreview));
  };

  const onUploadFileButtonClicked = (): void => {
    errorService.addBreadcrumb({
      level: 'info',
      category: 'button',
      message: 'File upload button clicked in Shared view',
      data: {
        currentFolderId: currentFolderId,
      },
    });
    fileInputRef.current?.click();
  };

  const onUploadFileInputChanged = async ({ files }: { files: FileList | null }) => {
    const items = files;

    dispatch(
      storageActions.setItems({
        folderId: currentParentFolderId as string,
        items: shareItems as unknown as DriveItemData[],
      }),
    );

    if (!items) return;

    if (items.length >= UPLOAD_ITEMS_LIMIT || !currentParentFolderId) {
      dispatch(uiActions.setIsUploadItemsFailsDialogOpen(true));
      notificationsService.show({
        text: translate('drive.uploadItems.advice'),
        type: ToastType.Warning,
      });
      return; // Exit the function if the condition fails
    }

    let ownerUserAuthenticationData;

    const isSecondLevelOfFoldersOrMore = sharedNamePath.length >= 2;
    const isOwnerOfFolder = filesOwnerCredentials?.networkUser === currentUser?.email;
    const token = isSecondLevelOfFoldersOrMore ? currentFolderLevelResourcesToken : nextFolderLevelResourcesToken;
    if (filesOwnerCredentials && currentUser && isOwnerOfFolder) {
      ownerUserAuthenticationData = {
        bridgeUser: filesOwnerCredentials?.networkUser,
        bridgePass: filesOwnerCredentials?.networkPass,
        encryptionKey: currentUser?.mnemonic,
        bucketId: currentUser.bucket,
        token,
      };
    } else {
      const mnemonicDecrypted =
        selectedWorkspace?.workspaceUser.key ?? (ownerEncryptionKey ? await decryptMnemonic(ownerEncryptionKey) : null);
      if (filesOwnerCredentials && mnemonicDecrypted && ownerBucket) {
        ownerUserAuthenticationData = {
          bridgeUser: filesOwnerCredentials?.networkUser,
          bridgePass: filesOwnerCredentials?.networkPass,
          encryptionKey: mnemonicDecrypted,
          bucketId: ownerBucket,
          token,
        };
      }
    }

    await dispatch(
      storageThunks.uploadSharedItemsThunk({
        files: Array.from(items),
        parentFolderId: currentParentFolderId,
        currentFolderId,
        ownerUserAuthenticationData,
        isDeepFolder: isSecondLevelOfFoldersOrMore,
      }),
    );

    actionDispatch(setHasMoreFiles(true));
    fetchFiles(true, workspaceId);
  };

  const handleIsItemOwnedByCurrentUser = (givenItemUserUUID?: string) => {
    const itemUserUUID = givenItemUserUUID ?? clickedShareItemUser?.uuid;
    return isItemOwnedByCurrentUser(currentUser?.uuid, itemUserUUID);
  };

  // DIALOGS HANDLE FUNCTIONS
  const onCloseEditNameItems = (newItem?: DriveItemData) => {
    if (newItem) {
      if (isFileViewerOpen) {
        dispatch(uiActions.setCurrentEditingNameDirty(newItem.plainName ?? newItem.name));
      }

      const setItemFunction = newItem.isFolder ? setSharedFolders : setSharedFiles;
      const editNameItemUuid = newItem?.uuid ?? '';
      const renamedShareItems = shareItems.map((shareItem) => {
        const shareItemUuid = (shareItem as unknown as DriveItemData).uuid ?? '';
        const isEditedItem =
          shareItemUuid.length > 0 && editNameItemUuid.length > 0 && shareItemUuid === editNameItemUuid;
        if (isEditedItem && newItem.plainName) {
          shareItem.plainName = newItem.plainName;
        }
        return shareItem;
      });
      const sharedItemsFiltered = renamedShareItems.filter((item) =>
        newItem.isFolder ? item.isFolder : !item.isFolder,
      );
      actionDispatch(setItemFunction(sharedItemsFiltered));
    }

    actionDispatch(setIsEditNameDialogOpen(false));
    actionDispatch(setEditNameItem());
  };

  const onOpenStopSharingDialog = () => {
    actionDispatch(setShowStopSharingConfirmation(true));
  };

  const onCloseStopSharingDialog = () => {
    actionDispatch(setShowStopSharingConfirmation(false));
  };

  const handleDetailsButtonClicked = (item: DriveItemData | AdvancedSharedItem) => {
    handleOnItemDoubleClick(item as AdvancedSharedItem);
  };

  const moveItemsToTrashOnStopSharing = async (items: DriveItemData[]) => {
    await moveSelectedItemsToTrash(items);

    if (isFileViewerOpen) {
      handleOpenItemPreview(false);
    }
  };

  const handleOnCloseShareDialog = () => {
    setTimeout(() => {
      if (!isShareDialogOpen && !folderUUID && isRootFolder) {
        // This is added so that in case the element is no longer shared due
        // to changes in the share dialog it will disappear from the list.
        resetSharedViewState();
        fetchRootFolders(workspaceId);
      }
    }, 200);
  };

  const handleOnTopBarInputChanges = (e: ChangeEvent<HTMLInputElement>) => {
    onUploadFileInputChanged({
      files: e.target.files,
    });
  };

  const onClickPendingInvitationsButton = () => {
    dispatch(uiActions.setIsInvitationsDialogOpen(true));
  };

  return (
    <div
      className="flex w-full shrink-0 flex-col"
      onContextMenu={(e) => {
        e.preventDefault();
      }}
    >
      <Helmet>
        <title>{translate('sideNav.shared')} - Internxt Drive</title>
      </Helmet>
      <div className="z-30 flex h-14 w-full shrink-0 flex-row items-center px-5">
        <div className="flex w-full flex-row items-center">
          <BreadcrumbsSharedView resetSharedItems={resetSharedItems} sharedNamePath={sharedNamePath} />
        </div>
        <TopBarButtons
          fileInputRef={fileInputRef}
          onUploadFileInputChanged={handleOnTopBarInputChanges}
          onUploadFileButtonClicked={onUploadFileButtonClicked}
          showUploadFileButton={!!(!isRootFolder && currentUserRole && !isCurrentUserViewer(currentUserRole))}
          numberOfPendingInvitations={pendingInvitations.length}
          onClickPendingInvitationsButton={onClickPendingInvitationsButton}
          disableUploadFileButton={isRootFolder}
          selectedWorkspace={selectedWorkspace}
        />
      </div>
      <WarningMessageWrapper />
      <div className="flex h-full w-full flex-col overflow-y-auto" ref={drop}>
        {
          /* DRAG AND DROP */
          isOver && canDrop && (
            <div
              className="drag-over-effect pointer-events-none\
                    absolute z-50 flex h-full w-full items-end justify-center"
            ></div>
          )
        }
        <SharedItemListContainer
          isRootFolder={isRootFolder}
          disableKeyboardShortcuts={disableKeyboardShortcuts || showStopSharingConfirmation}
          onItemDoubleClicked={handleOnItemDoubleClick}
          onUploadFileButtonClicked={onUploadFileButtonClicked}
          isCurrentUserViewer={() => isCurrentUserViewer(currentUserRole)}
          sharedNamePath={sharedNamePath}
          isItemOwnedByCurrentUser={handleIsItemOwnedByCurrentUser}
          onOpenStopSharingDialog={onOpenStopSharingDialog}
          onRenameSelectedItem={renameItem}
          onOpenItemPreview={(item: PreviewFileItem) => {
            handleOpenItemPreview(true, item);
          }}
        />
      </div>
      <MoveItemsDialog
        items={shareItems.map((shareItem) => ({
          ...(shareItem as unknown as DriveItemData),
          isFolder: shareItem.isFolder,
        }))}
        isTrash={false}
      />
      <EditItemNameDialog
        item={editNameItem}
        resourceToken={nextFolderLevelResourcesToken}
        isOpen={isEditNameDialogOpen}
        onClose={onCloseEditNameItems}
      />
      <NameCollisionContainer />
      {itemToView && (
        <FileViewerWrapper
          file={itemToView}
          showPreview={isFileViewerOpen}
          onClose={() => handleOpenItemPreview(false)}
          onShowStopSharingDialog={onOpenStopSharingDialog}
          sharedKeyboardShortcuts={{
            renameItemFromKeyboard: !isCurrentUserViewer(currentUserRole) ? renameItem : undefined,
            removeItemFromKeyboard: handleIsItemOwnedByCurrentUser() ? onOpenStopSharingDialog : undefined,
          }}
        />
      )}
      <StopSharingAndMoveToTrashDialogWrapper
        onClose={onCloseStopSharingDialog}
        selectedItems={itemToView ? [itemToView] : selectedItems}
        isItemOwnedByCurrentUser={handleIsItemOwnedByCurrentUser}
        showStopSharingConfirmation={showStopSharingConfirmation}
        moveItemsToTrash={moveItemsToTrashOnStopSharing}
      />
      <ItemDetailsDialog onDetailsButtonClicked={handleDetailsButtonClicked} />
      <ShareDialog
        onCloseDialog={handleOnCloseShareDialog}
        onStopSharingItem={() => actionDispatch(setSelectedItems([]))}
      />
      {isShowInvitationsOpen && <ShowInvitationsDialog onClose={onShowInvitationsModalClose} />}
      <DeleteDialog
        isOpen={isDeleteDialogModalOpen && selectedItems.length > 0}
        onClose={closeConfirmDelete}
        onSecondaryAction={closeConfirmDelete}
        secondaryAction={translate('modals.removeSharedLinkModal.cancel')}
        title={
          selectedItems.length > 1
            ? translate('shared-links.item-menu.delete-links')
            : translate('shared-links.item-menu.delete-link')
        }
        subtitle={
          selectedItems.length > 1
            ? translate('modals.removeSharedLinkModal.multiSharedDescription')
            : translate('modals.removeSharedLinkModal.singleSharedDescription')
        }
        onPrimaryAction={onDeleteSelectedItems}
        primaryAction={
          selectedItems.length > 1
            ? translate('modals.removeSharedLinkModal.deleteLinks')
            : translate('modals.removeSharedLinkModal.deleteLink')
        }
        primaryActionColor="danger"
      />
    </div>
  );
}

export default connect((state: RootState) => ({
  isShareDialogOpen: state.ui.isShareDialogOpen,
  isShowInvitationsOpen: state.ui.isInvitationsDialogOpen,
  sharedNamePath: state.storage.sharedNamePath,
  currentShareId: state.shared.currentShareId,
  currentUserRole: state.shared.currentSharingRole,
  disableKeyboardShortcuts:
    state.ui.isShareDialogOpen ||
    state.ui.isEditFolderNameDialog ||
    state.ui.isFileViewerOpen ||
    state.ui.isMoveItemsDialogOpen ||
    state.ui.isCreateFolderDialogOpen ||
    state.ui.isNameCollisionDialogOpen ||
    state.ui.isReachedPlanLimitDialogOpen ||
    state.ui.isItemDetailsDialogOpen,
}))(SharedView);
