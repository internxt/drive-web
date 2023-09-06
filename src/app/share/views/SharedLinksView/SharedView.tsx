import dateService from '../../../core/services/date.service';
import BaseButton from '../../../shared/components/forms/BaseButton';
import { Trash, Users } from '@phosphor-icons/react';
import List from '../../../shared/components/List';
import DeleteDialog from '../../../shared/components/Dialog/Dialog';
import { useState, useEffect } from 'react';
import iconService from '../../../drive/services/icon.service';
import copy from 'copy-to-clipboard';
import Empty from '../../../shared/components/Empty/Empty';
import emptyStateIcon from 'assets/icons/file-types/default.svg';
import shareService, { decryptMnemonic } from '../../../share/services/share.service';
import notificationsService, { ToastType } from '../../../notifications/services/notifications.service';
import _ from 'lodash';
import { ListAllSharedFoldersResponse, ListSharedItemsResponse } from '@internxt/sdk/dist/drive/share/types';
import { DriveFileData, DriveItemData } from '../../../drive/types';
import { aes } from '@internxt/lib';
import localStorageService from '../../../core/services/local-storage.service';
import sizeService from '../../../drive/services/size.service';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { storageActions } from '../../../store/slices/storage';
import { uiActions } from '../../../store/slices/ui';
import { useTranslationContext } from '../../../i18n/provider/TranslationProvider';
import { t } from 'i18next';
import {
  contextMenuDriveFolderSharedAFS,
  contextMenuDriveItemSharedAFS,
  contextMenuMultipleSharedViewAFS,
} from '../../../drive/components/DriveExplorer/DriveExplorerList/DriveItemContextMenu';
import moveItemsToTrash from '../../../../use_cases/trash/move-items-to-trash';
import MoveItemsDialog from '../../../drive/components/MoveItemsDialog/MoveItemsDialog';
import EditItemNameDialog from '../../../drive/components/EditItemNameDialog/EditItemNameDialog';
import TooltipElement, { DELAY_SHOW_MS } from '../../../shared/components/Tooltip/Tooltip';
import errorService from '../../../core/services/error.service';
import ShareDialog from '../../../drive/components/ShareDialog/ShareDialog';
import Avatar from '../../../shared/components/Avatar';
import envService from '../../../core/services/env.service';
import { AdvancedSharedItem, OrderBy, PreviewFileItem, SharedNamePath } from '../../../share/types';
import Breadcrumbs, { BreadcrumbItemData } from '../../../shared/components/Breadcrumbs/Breadcrumbs';
import { getItemPlainName } from '../../../crypto/services/utils';
import ShowInvitationsDialog from 'app/drive/components/ShowInvitationsDialog/ShowInvitationsDialog';

const REACT_APP_SHARE_LINKS_DOMAIN = process.env.REACT_APP_SHARE_LINKS_DOMAIN || window.location.origin;

function copyShareLink(type: string, code: string, token: string) {
  copy(`${REACT_APP_SHARE_LINKS_DOMAIN}/s/${type}/${token}/${code}`);
  notificationsService.show({ text: t('shared-links.toast.copy-to-clipboard'), type: ToastType.Success });
}

export const ITEMS_PER_PAGE = 15;

// TODO: FINISH LOGIC WHEN ADD MORE ADVANCED SHARING FEATURES
export default function SharedView(): JSX.Element {
  const { translate } = useTranslationContext();
  const dispatch = useAppDispatch();
  const isShareDialogOpen = useAppSelector((state) => state.ui.isShareDialogOpen);
  const isShowInvitationsOpen = useAppSelector((state) => state.ui.isInvitationsDialogOpen);

  const [hasMoreItems, setHasMoreItems] = useState<boolean>(true);
  const [hasMoreFolders, setHasMoreFolders] = useState<boolean>(true);
  const [page, setPage] = useState<number>(0);
  const [orderBy, setOrderBy] = useState<OrderBy>();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedItems, setSelectedItems] = useState<any[]>([]);
  const [shareItems, setShareItems] = useState<AdvancedSharedItem[]>([]);
  const [editNameItem, setEditNameItem] = useState<DriveItemData>();
  const [isEditNameDialogOpen, setIsEditNameDialogOpen] = useState<boolean>(false);
  const [isDeleteDialogModalOpen, setIsDeleteDialogModalOpen] = useState<boolean>(false);
  const [currentResourcesToken, setCurrentResourcesToken] = useState<string>('');
  const [nextResourcesToken, setNextResourcesToken] = useState<string>('');
  const [user, setUser] = useState<AdvancedSharedItem['user']>();
  const [currentFolderId, setCurrentFolderId] = useState<string>('');
  const [encryptionKey, setEncryptionKey] = useState<string>('');

  useEffect(() => {
    if (page === 0) {
      fetchRootItems();
      dispatch(storageActions.resetSharedNamePath());
    }
  }, []);

  useEffect(() => {
    if (!isShowInvitationsOpen || !isShareDialogOpen) fetchRootItems();
  }, [isShowInvitationsOpen, isShareDialogOpen]);

  useEffect(() => {
    if (page === 0) {
      fetchFolders();
    }
  }, [currentFolderId]);

  useEffect(() => {
    if (page === 0) {
      fetchFiles();
    }
  }, [hasMoreFolders]);

  useEffect(() => {
    if (!currentFolderId && hasMoreItems && page >= 1) {
      fetchRootItems();
    }
    if (currentFolderId && hasMoreFolders && hasMoreItems && page >= 1) {
      fetchFolders();
    }
    if (currentFolderId && !hasMoreFolders && hasMoreItems && page >= 1) {
      fetchFiles();
    }
  }, [page]);

  const fetchRootItems = async () => {
    setIsLoading(true);

    setCurrentResourcesToken('');
    setNextResourcesToken('');

    try {
      const response: ListAllSharedFoldersResponse = await shareService.getAllSharedFolders(
        page,
        ITEMS_PER_PAGE,
        orderBy ? `${orderBy.field}:${orderBy.direction}` : undefined,
      );

      const folders = response.folders.map((folder) => {
        const shareItem = folder as AdvancedSharedItem;
        shareItem.isFolder = true;
        shareItem.isRootLink = true;
        shareItem.name = getItemPlainName(shareItem as unknown as DriveItemData);
        shareItem.credentials = { user: response.credentials.networkUser, pass: response.credentials.networkPass };
        return shareItem;
      });

      let items;

      if (page === 0) {
        items = [...folders];
      } else {
        items = [...shareItems, ...folders];
      }

      setShareItems(items);

      if (folders.length < ITEMS_PER_PAGE) {
        setHasMoreItems(false);
      }
    } catch (error) {
      errorService.reportError(error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchFolders = async () => {
    if (currentFolderId && hasMoreFolders) {
      setIsLoading(true);
      try {
        const response: ListSharedItemsResponse = await shareService.getSharedFolderContent(
          currentFolderId,
          'folders',
          currentResourcesToken,
          page,
          ITEMS_PER_PAGE,
          orderBy ? `${orderBy.field}:${orderBy.direction}` : undefined,
        );

        const token = response.token;
        setNextResourcesToken(token);

        const folders = response.items.map((folder) => {
          const shareItem = folder as AdvancedSharedItem;
          shareItem.isFolder = true;
          shareItem.isRootLink = false;
          shareItem.name = getItemPlainName(shareItem as unknown as DriveItemData);
          shareItem.credentials = { user: response.credentials.networkUser, pass: response.credentials.networkPass };
          return shareItem;
        });

        let items;

        if (page === 0) {
          items = [...folders];
        } else {
          items = [...shareItems, ...folders];
        }

        setShareItems(items);

        if (folders.length < ITEMS_PER_PAGE) {
          setPage(0);
          setHasMoreFolders(false);
        }
      } catch (error) {
        errorService.reportError(error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const fetchFiles = async () => {
    if (currentFolderId && !hasMoreFolders && hasMoreItems) {
      setIsLoading(true);
      try {
        const response: ListSharedItemsResponse = await shareService.getSharedFolderContent(
          currentFolderId,
          'files',
          currentResourcesToken,
          page,
          ITEMS_PER_PAGE,
          orderBy ? `${orderBy.field}:${orderBy.direction}` : undefined,
        );

        const token = response.token;
        setNextResourcesToken(token);

        const files = response.items.map((file) => {
          const shareItem = file as AdvancedSharedItem;
          shareItem.isFolder = false;
          shareItem.isRootLink = false;
          shareItem.name = getItemPlainName(shareItem as unknown as DriveItemData);
          shareItem.credentials = { user: response.credentials.networkUser, pass: response.credentials.networkPass };
          return shareItem;
        });

        const items = [...shareItems, ...files];
        setShareItems(items);

        if (files.length < ITEMS_PER_PAGE) {
          setHasMoreItems(false);
        }
      } catch (error) {
        errorService.reportError(error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const onItemDoubleClicked = (shareItem: AdvancedSharedItem) => {
    dispatch(
      storageActions.pushSharedNamePath({
        id: shareItem.id,
        name: shareItem.plainName,
        token: nextResourcesToken,
        uuid: shareItem.uuid,
      }),
    );

    if (shareItem.isFolder) {
      const sharedFolderId = shareItem.uuid;

      if (shareItem.user) {
        setUser(shareItem.user);
      }

      if (shareItem.encryptionKey) {
        setEncryptionKey(shareItem.encryptionKey);
      }

      setCurrentResourcesToken(nextResourcesToken);
      setNextResourcesToken('');

      setPage(0);
      setShareItems([]);
      setHasMoreFolders(true);
      setHasMoreItems(true);
      setCurrentFolderId(sharedFolderId);
    } else {
      openPreview(shareItem);
    }
  };

  const onNameClicked = (props) => {
    onItemDoubleClicked(props);
  };

  const onNextPage = () => {
    setPage(page + 1);
  };

  const closeConfirmDelete = () => {
    setIsDeleteDialogModalOpen(false);
  };

  const isItemSelected = (item: any) => {
    return selectedItems.some((i) => item.id === i.id);
  };

  const onOrderByChanged = (newOrderBy: OrderBy) => {
    setPage(0);
  };

  const deleteShareLink = async (shareId: string) => {
    //TODO check if its deleted correctly
    //setShareItems((items) => items.filter((item) => item.id !== shareId));
    //setSelectedItems((items) => items.filter((item) => item.id !== shareId));
    return await shareService.deleteShareLink(shareId);
  };

  const onDeleteSelectedItems = async () => {
    if (selectedItems.length > 0) {
      setIsLoading(true);

      const CHUNK_SIZE = 10;
      const chunks = _.chunk(selectedItems, CHUNK_SIZE);
      for (const chunk of chunks) {
        const promises = chunk.map((item) => deleteShareLink(item.id));
        await Promise.all(promises);
      }

      const stringLinksDeleted =
        selectedItems.length > 1
          ? translate('shared-links.toast.links-deleted')
          : translate('shared-links.toast.link-deleted');
      notificationsService.show({ text: stringLinksDeleted, type: ToastType.Success });
      closeConfirmDelete();
      setIsLoading(false);
    }
  };

  const onSelectedItemsChanged = (changes: { props: any; value: boolean }[]) => {
    let updatedSelectedItems = selectedItems;

    for (const change of changes) {
      updatedSelectedItems = updatedSelectedItems.filter((item) => item.id !== change.props.id);
      if (change.value) {
        updatedSelectedItems = [...updatedSelectedItems, change.props];
      }
    }

    setSelectedItems(updatedSelectedItems);
  };

  const copyLink = (item) => {
    const itemType = item.isFolder ? 'folder' : 'file';
    const encryptedCode = item.code || item.encryptedCode;
    const plainCode = aes.decrypt(encryptedCode, localStorageService.getUser()!.mnemonic);
    copyShareLink(itemType, plainCode, item.token);
  };

  const openShareAccessSettings = (shareItem: AdvancedSharedItem) => {
    {
      dispatch(storageActions.setItemToShare({ item: shareItem as unknown as DriveItemData }));
    }

    envService.isProduction()
      ? dispatch(uiActions.setIsShareItemDialogOpen(true))
      : dispatch(uiActions.setIsShareDialogOpen(true));
  };

  const moveSelectedItemsToTrash = async () => {
    const itemsToTrash = selectedItems.map((selectedShareItem) => ({
      ...(selectedShareItem as DriveItemData),
      isFolder: selectedShareItem.isFolder,
    }));
    await moveItemsToTrash(itemsToTrash);
  };

  const moveToTrash = async (shareItem: AdvancedSharedItem) => {
    const itemToTrash = {
      ...(shareItem as unknown as DriveItemData),
      isFolder: shareItem.isFolder,
    };
    await moveItemsToTrash([itemToTrash]);
  };

  const downloadItem = async (shareItem: AdvancedSharedItem) => {
    try {
      if (shareItem.isRootLink) {
        const { credentials, token } = await shareService.getSharedFolderContent(
          shareItem.uuid,
          'files',
          '',
          0,
          ITEMS_PER_PAGE,
          orderBy ? `${orderBy.field}:${orderBy.direction}` : undefined,
        );
        await shareService.downloadSharedFiles({
          creds: {
            user: credentials.networkUser,
            pass: credentials.networkPass,
          },
          dispatch,
          selectedItems,
          encryptionKey: shareItem.encryptionKey,
          token,
        });
      } else {
        await shareService.downloadSharedFiles({
          creds: shareItem.credentials,
          dispatch,
          selectedItems,
          encryptionKey: encryptionKey,
          token: '',
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

  const renameItem = (shareItem: AdvancedSharedItem) => {
    setEditNameItem(shareItem as unknown as DriveItemData);
    setIsEditNameDialogOpen(true);
  };

  const onCloseEditNameItems = (newItem?: DriveItemData) => {
    if (newItem) {
      const editNameItemUuid = newItem.uuid || '';
      setShareItems(
        shareItems.map((shareItem) => {
          const shareItemUuid = (shareItem as unknown as DriveItemData).uuid || '';
          if (
            shareItemUuid.length > 0 &&
            editNameItemUuid.length > 0 &&
            newItem.plainName &&
            shareItemUuid === editNameItemUuid
          ) {
            shareItem.plainName = newItem.plainName;
          }
          return shareItem;
        }),
      );
    }
    setIsEditNameDialogOpen(false);
    setEditNameItem(undefined);
  };

  const openPreview = async (shareItem: AdvancedSharedItem) => {
    const previewItem = shareItem as unknown as PreviewFileItem;

    const mnemonic = await decryptMnemonic(shareItem.encryptionKey ? shareItem.encryptionKey : encryptionKey);

    dispatch(uiActions.setFileViewerItem({ ...previewItem, mnemonic }));
    dispatch(uiActions.setIsFileViewerOpen(true));
  };

  const isItemOwnedByCurrentUser = () => {
    const currentUser = localStorageService.getUser();
    if (currentUser?.uuid && user?.uuid) {
      return currentUser.uuid === user.uuid;
    }
    return false;
  };

  const skinSkeleton = [
    <div className="flex flex-row items-center space-x-4">
      <div className="h-8 w-8 rounded-md bg-gray-5" />
      <div className="h-4 w-40 rounded bg-gray-5" />
    </div>,
    <div className="h-4 w-20 rounded bg-gray-5" />,
    <div className="h-4 w-24 rounded bg-gray-5" />,
    <div className="h-4 w-20 rounded bg-gray-5" />,
  ];

  const emptyState = (
    <Empty
      icon={
        <div className="relative">
          <img className="w-36" alt="" src={emptyStateIcon} />
          <div className=" absolute -bottom-1 right-2 flex h-10 w-10 flex-col items-center justify-center rounded-full bg-primary text-white shadow-subtle-hard ring-8 ring-primary ring-opacity-10">
            <Users size={24} />
          </div>
        </div>
      }
      title={translate('shared-links.empty-state.title')}
      subtitle={translate('shared-links.empty-state.subtitle')}
    />
  );

  const goToFolderBredcrumb = (id, name, uuid, token?) => {
    setHasMoreFolders(true);
    setHasMoreItems(true);
    setShareItems([]);
    setCurrentResourcesToken(token);
    if (id === 1) {
      setCurrentFolderId('');
    } else {
      setCurrentFolderId(uuid);
    }
    setPage[0];
    dispatch(storageActions.popSharedNamePath({ id: id, name: name, token: token, uuid: uuid }));
  };

  const breadcrumbItems = (): BreadcrumbItemData[] => {
    const sharedNamePath = useAppSelector((state) => state.storage.sharedNamePath);
    const items: BreadcrumbItemData[] = [];

    items.push({
      id: 1,
      label: translate('shared-links.shared-links'),
      icon: null,
      active: true,
      isFirstPath: true,
      onClick: () => {
        setPage[0];
        setShareItems([]);
        setHasMoreFolders(true);
        setHasMoreItems(true);
        setCurrentFolderId('');
        goToFolderBredcrumb(1, translate('shared-links.shared-links'), '');
        fetchRootItems();
      },
    });

    sharedNamePath.slice().forEach((path: SharedNamePath, i: number, namePath: SharedNamePath[]) => {
      items.push({
        id: path.id,
        label: path.name,
        icon: null,
        active: i < namePath.length - 1,
        onClick: () => goToFolderBredcrumb(path.id, path.name, path.uuid, path.token),
      });
    });

    return items;
  };

  return (
    <div
      className="flex w-full flex-shrink-0 flex-col"
      onContextMenu={(e) => {
        e.preventDefault();
      }}
    >
      <div className="flex h-14 w-full flex-shrink-0 flex-row items-center px-5">
        <div className="flex w-full flex-row items-center">
          <Breadcrumbs items={breadcrumbItems()} />
        </div>

        <div
          className="flex flex-row items-center"
          data-tooltip-id="delete-link-tooltip"
          data-tooltip-content={translate('shared-links.item-menu.delete-link')}
          data-tooltip-place="bottom"
        >
          <BaseButton
            onClick={(e) => {
              e.stopPropagation();
              dispatch(uiActions.setIsInvitationsDialogOpen(true));
            }}
            className="tertiary squared"
            disabled={false}
          >
            <Users size={24} />
          </BaseButton>
          <BaseButton
            onClick={(e) => {
              e.stopPropagation();
              setIsDeleteDialogModalOpen(true);
            }}
            className="tertiary squared"
            disabled={!(selectedItems.length > 0)}
          >
            <Trash size={24} />
          </BaseButton>
          <TooltipElement id="delete-link-tooltip" delayShow={DELAY_SHOW_MS} />
        </div>
      </div>
      <div className="flex h-full w-full flex-col overflow-y-auto">
        <List<any, 'updatedAt' | 'createdAt' | 'createdAt' | 'ownerId' | 'fileSize'>
          header={[
            {
              label: translate('shared-links.list.name'),
              width: 'flex-1 min-w-104 flex-shrink-0 whitespace-nowrap', //flex-grow w-1
              name: 'folder',
              orderable: false,
            },
            {
              label: translate('shared-links.list.owner'),
              width: 'w-80', //w-1/12
              name: 'ownerId',
              orderable: true,
              defaultDirection: 'ASC',
            },

            {
              label: translate('shared-links.list.size'),
              width: 'w-40', //w-1.5/12
              name: 'fileSize',
              orderable: true,
              defaultDirection: 'ASC',
            },
            {
              label: translate('shared-links.list.created'),
              width: 'w-40', //w-2/12
              name: 'createdAt',
              orderable: true,
              defaultDirection: 'ASC',
            },
          ]}
          items={shareItems}
          isLoading={isLoading}
          onClick={(item) => {
            const unselectedDevices = selectedItems.map((deviceSelected) => ({ props: deviceSelected, value: false }));
            onSelectedItemsChanged([...unselectedDevices, { props: item, value: true }]);
          }}
          itemComposition={[
            (shareItem: AdvancedSharedItem) => {
              const Icon = iconService.getItemIcon(shareItem.isFolder, (shareItem as unknown as DriveFileData)?.type);
              return (
                <div className={'flex w-full flex-row items-center space-x-6 overflow-hidden'}>
                  <div className="my-5 flex h-8 w-8 flex-shrink items-center justify-center">
                    <Icon className="absolute h-8 w-8 flex-shrink-0 drop-shadow-soft filter" />
                    <div className="z-index-10 relative left-4 top-3 flex h-4 w-4 items-center justify-center rounded-full bg-primary font-normal text-white shadow-subtle-hard ring-2 ring-white ring-opacity-90">
                      <Users size={12} color="white" weight="fill" />
                    </div>
                  </div>
                  <div className="w-full max-w-full pr-16" onDoubleClick={() => onItemDoubleClicked(shareItem)}>
                    <span
                      onClick={() => onNameClicked(shareItem)}
                      className="w-full max-w-full flex-1 cursor-pointer flex-row truncate whitespace-nowrap"
                      title={shareItem.plainName}
                    >
                      {shareItem.plainName}
                      {!shareItem.isFolder && shareItem.type && '.' + shareItem.type}
                    </span>
                  </div>
                </div>
              );
            },
            (shareItem: AdvancedSharedItem) => (
              <div className="flex flex-row items-center justify-center">
                <div className="mr-2">
                  <Avatar
                    diameter={28}
                    fullName={`${shareItem.user?.name} ${shareItem.user?.lastname}`}
                    src={shareItem.user?.avatar ? shareItem.user?.avatar : null}
                  />
                </div>
                <span className={`${isItemSelected(shareItem) ? 'text-gray-100' : 'text-gray-60'}`}>
                  {shareItem.user ? (
                    <span>{`${shareItem.user?.name} ${shareItem.user?.lastname}`}</span>
                  ) : (
                    <span>{`${user?.name} ${user?.lastname}`}</span>
                  )}{' '}
                </span>
              </div>
            ),
            (shareItem: AdvancedSharedItem) =>
              shareItem.isFolder ? (
                <span className="opacity-25">—</span>
              ) : (
                <span>{`${sizeService.bytesToString(shareItem?.size ? shareItem.size : 0, false)}`}</span>
              ),
            (shareItem: AdvancedSharedItem) => (
              <span className={`${isItemSelected(shareItem) ? 'text-gray-100' : 'text-gray-60'}`}>
                {dateService.format(shareItem.createdAt, 'D MMM YYYY')}
              </span>
            ),
          ]}
          skinSkeleton={skinSkeleton}
          emptyState={emptyState}
          onNextPage={onNextPage}
          hasMoreItems={hasMoreItems}
          menu={
            selectedItems.length > 1
              ? contextMenuMultipleSharedViewAFS({
                  deleteLink: () => setIsDeleteDialogModalOpen(true),
                  downloadItem: downloadItem,
                  moveToTrash: isItemOwnedByCurrentUser() ? moveToTrash : undefined,
                })
              : selectedItems[0]?.isFolder
              ? contextMenuDriveFolderSharedAFS({
                  copyLink,
                  deleteLink: () => setIsDeleteDialogModalOpen(true),
                  openShareAccessSettings,
                  renameItem: isItemOwnedByCurrentUser() ? renameItem : undefined,
                  moveItem: isItemOwnedByCurrentUser() ? moveItem : undefined,
                  downloadItem: downloadItem,
                  moveToTrash: isItemOwnedByCurrentUser() ? moveToTrash : undefined,
                })
              : contextMenuDriveItemSharedAFS({
                  openPreview: openPreview,
                  copyLink,
                  deleteLink: () => setIsDeleteDialogModalOpen(true),
                  openShareAccessSettings,
                  renameItem: renameItem,
                  moveItem: isItemOwnedByCurrentUser() ? moveItem : undefined,
                  downloadItem: downloadItem,
                  moveToTrash: isItemOwnedByCurrentUser() ? moveToTrash : undefined,
                })
          }
          keyBoardShortcutActions={{
            onBackspaceKeyPressed: moveSelectedItemsToTrash,
            onRKeyPressed: () => {
              if (selectedItems.length === 1) {
                const selectedItem = selectedItems[0];
                const itemToRename = {
                  ...(selectedItem as unknown as DriveItemData),
                  name: selectedItem.plainName ? selectedItem.plainName : '',
                };
                setEditNameItem(itemToRename);
              }
            },
          }}
          selectedItems={selectedItems}
          keyboardShortcuts={['unselectAll', 'selectAll', 'multiselect']}
          //   disableKeyboardShortcuts={isUpdateLinkModalOpen}
          // onOrderByChanged={onOrderByChanged}
          // orderBy={orderBy}
          onSelectedItemsChanged={onSelectedItemsChanged}
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
        resourceToken={nextResourcesToken}
        isOpen={isEditNameDialogOpen}
        onClose={onCloseEditNameItems}
      />
      {isShareDialogOpen && <ShareDialog />}
      {isShowInvitationsOpen && <ShowInvitationsDialog />}
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
