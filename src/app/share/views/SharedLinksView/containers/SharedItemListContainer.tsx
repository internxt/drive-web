import { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { DriveItemData, DriveItemDetails } from '../../../../drive/types';
import { storageActions } from '../../../../store/slices/storage';
import { uiActions } from '../../../../store/slices/ui';
import EmptySharedView from '../../../components/EmptySharedView/EmptySharedView';
import { AdvancedSharedItem, PreviewFileItem, SharedNamePath } from '../../../types';
import { OrderField, SharedItemList } from '../components/SharedItemList';

import errorService from '../../../../core/services/error.service';
import localStorageService from '../../../../core/services/local-storage.service';
import { OrderDirection } from '../../../../core/types';
import { sharedThunks } from '../../../../store/slices/sharedLinks';
import shareService, { decryptMnemonic } from '../../../services/share.service';
import { setOrderBy, setPage, setSelectedItems } from '../context/SharedViewContext.actions';
import { useShareViewContext } from '../context/SharedViewContextProvider';
import useSharedContextMenu from '../hooks/useSharedContextMenu';
import { isItemsOwnedByCurrentUser, sortSharedItems } from '../sharedViewUtils';

type ShareItemListContainerProps = {
  disableKeyboardShortcuts: boolean;
  sharedNamePath: SharedNamePath[];
  onItemDoubleClicked: (shareItem: AdvancedSharedItem) => void;
  onUploadFileButtonClicked: () => void;
  isCurrentUserViewer: () => boolean;
  isItemOwnedByCurrentUser: (userUUid?: string) => boolean;
  onOpenStopSharingDialog: () => void;
  onRenameSelectedItem: (shareItem: AdvancedSharedItem | DriveItemData) => void;
  onOpenItemPreview: (item: PreviewFileItem) => void;
};

const SharedItemListContainer = ({
  disableKeyboardShortcuts,
  onItemDoubleClicked,
  onUploadFileButtonClicked,
  isCurrentUserViewer,
  sharedNamePath,
  isItemOwnedByCurrentUser,
  onOpenStopSharingDialog,
  onRenameSelectedItem,
  onOpenItemPreview,
}: ShareItemListContainerProps) => {
  const dispatch = useDispatch();
  const { state, actionDispatch } = useShareViewContext();
  const {
    page,
    hasMoreFiles,
    hasMoreFolders,
    isLoading,
    shareFolders,
    shareFiles,
    selectedItems,
    currentFolderLevelResourcesToken,
    currentFolderId,
    currentShareOwnerAvatar,
    clickedShareItemUser: sharedItemUser,
    clickedShareItemEncryptionKey: sharedItemEncryptionKey,
    orderBy,
  } = state;
  const shareItems = [...shareFolders, ...shareFiles];
  const reorderedSharedItems = sortSharedItems(shareItems, orderBy);

  const hasMoreItems = hasMoreFiles || hasMoreFolders;
  const currentUser = localStorageService.getUser();

  const openShareAccessSettings = (shareItem: AdvancedSharedItem) => {
    const shareItemWithEmail = shareItem.user?.email
      ? shareItem
      : ({ ...shareItem, user: { email: shareItem.credentials.networkUser } } as AdvancedSharedItem & {
          user: { email: string };
        });
    dispatch(storageActions.setItemToShare({ item: shareItemWithEmail }));
    dispatch(uiActions.setIsShareDialogOpen(true));
  };

  const showDetails = (shareItem: AdvancedSharedItem) => {
    const isOwner = isItemOwnedByCurrentUser(shareItem.user?.uuid);
    const itemDetails: DriveItemDetails = {
      ...shareItem,
      isShared: true,
      userEmail: shareItem.user?.email ?? shareItem.credentials.networkUser,
      view: isOwner ? 'Drive' : 'Shared',
    };
    dispatch(uiActions.setItemDetailsItem(itemDetails));
    dispatch(uiActions.setIsItemDetailsDialogOpen(true));
  };

  const downloadItem = async (shareItem: AdvancedSharedItem): Promise<void> => {
    try {
      if (shareItem.isRootLink) {
        await shareService.downloadSharedFiles({
          creds: {
            user: shareItem.credentials.networkUser,
            pass: shareItem.credentials.networkPass,
          },
          dispatch,
          selectedItems,
          encryptionKey: shareItem.encryptionKey,
        });
      } else {
        const pageItemsNumber = 5;
        const { token } = await shareService.getSharedFolderContent(
          currentFolderId,
          'files',
          currentFolderLevelResourcesToken,
          0,
          pageItemsNumber,
        );
        await shareService.downloadSharedFiles({
          creds: {
            user: shareItem.credentials.networkUser,
            pass: shareItem.credentials.networkPass,
          },
          dispatch,
          selectedItems,
          encryptionKey: sharedItemEncryptionKey,
          token,
        });
      }
    } catch (err) {
      const error = errorService.castError(err);
      errorService.castError(error);
    }
  };

  const moveItem = (shareItem: AdvancedSharedItem) => {
    const itemToMove = {
      ...(shareItem as unknown as DriveItemData),
      isFolder: shareItem.isFolder,
    };
    dispatch(storageActions.setItemsToMove([itemToMove]));
    dispatch(uiActions.setIsMoveItemsDialogOpen(true));
  };

  const renameItem = (shareItem: AdvancedSharedItem | DriveItemData) => {
    onRenameSelectedItem(shareItem);
  };

  const openPreview = async (shareItem: AdvancedSharedItem) => {
    const previewItem = {
      ...(shareItem as unknown as PreviewFileItem),
      credentials: { user: shareItem.credentials.networkUser, pass: shareItem.credentials.networkPass },
    };

    try {
      const mnemonic = await decryptMnemonic(
        shareItem.encryptionKey ? shareItem.encryptionKey : sharedItemEncryptionKey,
      );
      onOpenItemPreview({ ...previewItem, mnemonic });
    } catch (err) {
      const error = errorService.castError(err);
      errorService.reportError(error);
    }
  };

  const copyLink = useCallback(
    (item: AdvancedSharedItem) => {
      dispatch(sharedThunks.getPublicShareLink({ itemUUid: item.uuid, itemType: item.isFolder ? 'folder' : 'file' }));
    },
    [dispatch, sharedThunks],
  );

  const checkIfIsItemsOwnedByCurrentUser = () =>
    isItemsOwnedByCurrentUser(selectedItems, currentUser?.uuid, sharedItemUser?.uuid);

  const handleOnSelectedItemsChanged = (changes: { props: AdvancedSharedItem; value: boolean }[]) => {
    let updatedSelectedItems = selectedItems;

    for (const change of changes) {
      updatedSelectedItems = updatedSelectedItems.filter((item) => item.id !== change.props.id);
      if (change.value) {
        updatedSelectedItems = [...updatedSelectedItems, change.props];
      }
    }

    actionDispatch(setSelectedItems(updatedSelectedItems));
  };

  const onNextPage = () => {
    actionDispatch(setPage(page + 1));
  };

  const onNameClicked = (shareItem: AdvancedSharedItem) => {
    onItemDoubleClicked(shareItem);
  };

  const sortBy = (value: { field: OrderField; direction: 'ASC' | 'DESC' }) => {
    const isSameField = orderBy?.field === value.field;
    const isDescOrder = orderBy?.direction === OrderDirection.Desc;

    const hasDescOrder = isSameField && isDescOrder;
    const direction = hasDescOrder ? OrderDirection.Asc : OrderDirection.Desc;

    actionDispatch(setOrderBy({ field: value.field, direction }));
  };

  const contextMenu = useSharedContextMenu({
    selectedItems,
    sharedContextMenuActions: {
      downloadItem,
      onOpenStopSharingDialog,
      copyLink,
      openShareAccessSettings,
      showDetails,
      renameItem,
      moveItem,
      openPreview(item) {
        openPreview(item);
      },
    },
    isItemsOwnedByCurrentUser: checkIfIsItemsOwnedByCurrentUser(),
    isCurrentUserViewer: isCurrentUserViewer(),
    isItemOwnedByCurrentUser,
  });

  return (
    <SharedItemList
      onClickItem={(item) => {
        const unselectedItems = selectedItems.map((selectedItem) => ({ props: selectedItem, value: false }));
        handleOnSelectedItemsChanged([...unselectedItems, { props: item, value: true }]);
      }}
      keyBoardShortcutActions={{
        onBackspaceKeyPressed: () => {
          if (selectedItems.length === 1) {
            isItemOwnedByCurrentUser(selectedItems[0].user?.uuid) && onOpenStopSharingDialog();
          } else if (selectedItems.length > 1) {
            checkIfIsItemsOwnedByCurrentUser() && onOpenStopSharingDialog();
          }
        },
        onRKeyPressed: () => {
          const isUserAllowedToRenameItem =
            !isCurrentUserViewer() || isItemOwnedByCurrentUser(selectedItems[0]?.user?.uuid);
          const canUserRenameItem = selectedItems.length === 1 && isUserAllowedToRenameItem;

          if (canUserRenameItem) {
            const selectedItem = selectedItems[0];
            const itemToRename = {
              ...selectedItem,
              name: selectedItem.plainName ? selectedItem.plainName : '',
            };
            renameItem(itemToRename);
          }
        },
      }}
      emptyStateElement={
        <EmptySharedView
          isCurrentUserViewer={isCurrentUserViewer}
          onUploadFileButtonClicked={onUploadFileButtonClicked}
          sharedNamePath={sharedNamePath}
        />
      }
      shareItems={reorderedSharedItems}
      isLoading={isLoading}
      disableKeyboardShortcuts={disableKeyboardShortcuts}
      selectedItems={selectedItems}
      onSelectedItemsChanged={handleOnSelectedItemsChanged}
      onItemDoubleClicked={onItemDoubleClicked}
      onNameClicked={onNameClicked}
      onNextPage={onNextPage}
      hasMoreItems={hasMoreItems}
      contextMenu={contextMenu}
      currentShareOwnerAvatar={currentShareOwnerAvatar}
      user={sharedItemUser}
      sortBy={sortBy}
      orderBy={orderBy}
    />
  );
};

export default SharedItemListContainer;
