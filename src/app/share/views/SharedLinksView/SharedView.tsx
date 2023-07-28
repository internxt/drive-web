import dateService from 'app/core/services/date.service';
import BaseButton from 'app/shared/components/forms/BaseButton';
import { Trash, Link } from '@phosphor-icons/react';
import List from 'app/shared/components/List';
import DeleteDialog from '../../../shared/components/Dialog/Dialog';
import { useState, useEffect } from 'react';
import iconService from 'app/drive/services/icon.service';
import copy from 'copy-to-clipboard';
import Empty from 'app/shared/components/Empty/Empty';
import emptyStateIcon from 'assets/icons/file-types/default.svg';
import shareService from 'app/share/services/share.service';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';
import _ from 'lodash';
import { ListAllSharedFoldersResponse } from '@internxt/sdk/dist/drive/share/types';
import { DriveFileData, DriveItemData } from '../../../drive/types';
import { aes } from '@internxt/lib';
import localStorageService from 'app/core/services/local-storage.service';
import sizeService from 'app/drive/services/size.service';
import { useAppDispatch, useAppSelector } from 'app/store/hooks';
import { storageActions } from 'app/store/slices/storage';
import { uiActions } from 'app/store/slices/ui';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import { t } from 'i18next';
import {
  contextMenuDriveFolderShared,
  contextMenuDriveItemShared,
  contextMenuMultipleSharedView,
} from '../../../drive/components/DriveExplorer/DriveExplorerList/DriveItemContextMenu';
import storageThunks from '../../../store/slices/storage/storage.thunks';
import moveItemsToTrash from '../../../../use_cases/trash/move-items-to-trash';
import MoveItemsDialog from '../../../drive/components/MoveItemsDialog/MoveItemsDialog';
import EditFolderNameDialog from '../../../drive/components/EditFolderNameDialog/EditFolderNameDialog';
import EditItemNameDialog from '../../../drive/components/EditItemNameDialog/EditItemNameDialog';
import TooltipElement, { DELAY_SHOW_MS } from '../../../shared/components/Tooltip/Tooltip';
import errorService from '../../../core/services/error.service';
import ShareDialog from '../../../drive/components/ShareDialog/ShareDialog';

type OrderBy = { field: 'views' | 'createdAt'; direction: 'ASC' | 'DESC' } | undefined;

const REACT_APP_SHARE_LINKS_DOMAIN = process.env.REACT_APP_SHARE_LINKS_DOMAIN || window.location.origin;

function copyShareLink(type: string, code: string, token: string) {
  copy(`${REACT_APP_SHARE_LINKS_DOMAIN}/s/${type}/${token}/${code}`);
  notificationsService.show({ text: t('shared-links.toast.copy-to-clipboard'), type: ToastType.Success });
}
const ITEMS_PER_PAGE = 50;
const SHARED_LINKS_FETCH_ITEMS = { FOLDERS: 'FOLDERS', FILES: 'FILES' };
type SharedLinksFetchItem = typeof SHARED_LINKS_FETCH_ITEMS[keyof typeof SHARED_LINKS_FETCH_ITEMS];

// TODO: FINISH LOGIC WHEN ADD MORE ADVANCED SHARING FEATURES
export default function SharedView(): JSX.Element {
  const { translate } = useTranslationContext();
  const dispatch = useAppDispatch();
  const isShareDialogOpen = useAppSelector((state) => state.ui.isShareDialogOpen);

  const [hasMoreItems, setHasMoreItems] = useState<boolean>(true);
  const [hasMoreFolders, setHasMoreFolders] = useState<boolean>(true);
  const [currentItemFetch, setCurrentItemFetch] = useState<SharedLinksFetchItem>(SHARED_LINKS_FETCH_ITEMS.FOLDERS);

  const [page, setPage] = useState<number>(0);
  const [orderBy, setOrderBy] = useState<OrderBy>(undefined);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedItems, setSelectedItems] = useState<any[]>([]);
  const [shareLinks, setShareLinks] = useState<any[]>([]);
  const [editNameItem, setEditNameItem] = useState<DriveItemData | null>(null);
  const [isDeleteDialogModalOpen, setIsDeleteDialogModalOpen] = useState<boolean>(false);

  function closeConfirmDelete() {
    setIsDeleteDialogModalOpen(false);
  }

  function isItemSelected(item: any) {
    return selectedItems.some((i) => item.id === i.id);
  }

  useEffect(() => {
    fetchItems(page, orderBy, 'append');
  }, []);

  async function fetchItems(page: number, orderBy: OrderBy, type: 'append' | 'substitute') {
    setIsLoading(true);

    try {
      let items;
      if (currentItemFetch === SHARED_LINKS_FETCH_ITEMS.FOLDERS) {
        let response: ListAllSharedFoldersResponse;

        if (hasMoreFolders) {
          response = await shareService.getAllSharedFolders(
            page,
            ITEMS_PER_PAGE,
            orderBy ? `${orderBy.field}:${orderBy.direction}` : undefined,
          );
          const foldersSharedByMe = response.sharedByMe;
          const foldersSharedWithMe = response.sharedWithMe;

          if (foldersSharedByMe.length < ITEMS_PER_PAGE && foldersSharedWithMe.length < ITEMS_PER_PAGE)
            setHasMoreFolders(false);
          if (response) items = [...foldersSharedByMe, ...foldersSharedWithMe];
        }
      } else if (currentItemFetch === SHARED_LINKS_FETCH_ITEMS.FILES) {
        // TODO: Add files fetch
      }

      if (type === 'append') {
        items = [...shareLinks, ...items];
      }
      setShareLinks(items);
      setOrderBy(orderBy);
      setPage(page);
    } catch (error) {
      errorService.reportError(error);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (!hasMoreFolders) {
      setCurrentItemFetch(SHARED_LINKS_FETCH_ITEMS.FILES);
    }
    // TODO: add files when implement files fetching
    setHasMoreItems(hasMoreFolders);
  }, [hasMoreFolders]);

  function onNextPage() {
    fetchItems(page + 1, orderBy, 'append');
  }

  function onOrderByChanged(newOrderBy: OrderBy) {
    setPage(0);
    fetchItems(0, newOrderBy, 'substitute');
  }

  async function deleteShareLink(shareId: string) {
    //TODO check if its deleted correctly
    //setShareLinks((items) => items.filter((item) => item.id !== shareId));
    //setSelectedItems((items) => items.filter((item) => item.id !== shareId));
    return await shareService.deleteShareLink(shareId);
  }

  async function onDeleteSelectedItems() {
    if (selectedItems.length > 0) {
      setIsLoading(true);
      console.log('selectedItems', selectedItems.length);

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
      await fetchItems(0, orderBy, 'substitute');
      closeConfirmDelete();
      setIsLoading(false);
    }
  }

  function onSelectedItemsChanged(changes: { props: any & { code: string }; value: boolean }[]) {
    let updatedSelectedItems = selectedItems;

    for (const change of changes) {
      updatedSelectedItems = updatedSelectedItems.filter((item) => item.id !== change.props.id);
      if (change.value) {
        updatedSelectedItems = [...updatedSelectedItems, change.props];
      }
    }

    setSelectedItems(updatedSelectedItems);
  }

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
            <Link size={24} />
          </div>
        </div>
      }
      title={translate('shared-links.empty-state.title')}
      subtitle={translate('shared-links.empty-state.subtitle')}
    />
  );

  const copyLink = (item) => {
    const itemType = item.isFolder ? 'folder' : 'file';
    const encryptedCode = item.code || item.encryptedCode;
    const plainCode = aes.decrypt(encryptedCode, localStorageService.getUser()!.mnemonic);
    copyShareLink(itemType, plainCode, item.token);
  };

  const openShareAccessSettings = (item) => {
    dispatch(storageActions.setItemToShare({ share: item, item: item.item }));
    const isProduction = process.env.NODE_ENV === 'production';
    isProduction ? dispatch(uiActions.setIsShareItemDialogOpen(true)) : dispatch(uiActions.setIsShareDialogOpen(true));
  };

  const moveSelectedItemsToTrash = async () => {
    const itemsToTrash = selectedItems.map((selectedShareLink) => ({
      ...(selectedShareLink.item as DriveItemData),
      isFolder: selectedShareLink.isFolder,
    }));
    await moveItemsToTrash(itemsToTrash);
    fetchItems(page, orderBy, 'substitute');
  };

  const moveToTrash = async (shareLink) => {
    const itemToTrash = {
      ...((shareLink as any).item as DriveItemData),
      isFolder: shareLink.isFolder,
    };
    await moveItemsToTrash([itemToTrash]);
    fetchItems(page, orderBy, 'substitute');
  };

  const downloadItem = (shareLink) => {
    const itemToDownload = {
      ...((shareLink as any).item as DriveItemData),
      isFolder: shareLink.isFolder,
    };
    dispatch(storageThunks.downloadItemsThunk([itemToDownload]));
  };

  const moveItem = (shareLink) => {
    const itemToMove = {
      ...((shareLink as any).item as DriveItemData),
      isFolder: shareLink.isFolder,
    };
    dispatch(storageActions.setItemsToMove([itemToMove]));
    dispatch(uiActions.setIsMoveItemsDialogOpen(true));
  };

  const renameItem = (shareLink) => {
    const itemToRename = {
      ...((shareLink as any).item as DriveItemData),
      isFolder: shareLink.isFolder,
    };
    setEditNameItem(itemToRename);
  };

  return (
    <div
      className="flex w-full flex-shrink-0 flex-col"
      onContextMenu={(e) => {
        e.preventDefault();
      }}
    >
      {editNameItem && (
        <EditItemNameDialog
          item={editNameItem}
          onClose={() => {
            setEditNameItem(null);
            fetchItems(0, orderBy, 'substitute');
          }}
        />
      )}
      <div className="flex h-14 w-full flex-shrink-0 flex-row items-center px-5">
        <div className="flex w-full flex-row items-center">
          <p className="text-lg">{translate('shared-links.shared-links')}</p>
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
              width: 'w-120', //w-1/12
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
          items={shareLinks}
          isLoading={isLoading}
          onClick={(item) => {
            const unselectedDevices = selectedItems.map((deviceSelected) => ({ props: deviceSelected, value: false }));
            onSelectedItemsChanged([...unselectedDevices, { props: item, value: true }]);
          }}
          itemComposition={[
            (props) => {
              console.log({ props });
              const Icon = iconService.getItemIcon(!!props.folder, (props.file as DriveFileData)?.type);
              return (
                <div className={'flex w-full cursor-pointer flex-row items-center space-x-6 overflow-hidden'}>
                  <div className="my-5 flex h-8 w-8 flex-shrink items-center justify-center">
                    <Icon className="absolute h-8 w-8 flex-shrink-0 drop-shadow-soft filter" />
                    <div className="z-index-10 relative left-4 top-3 flex h-4 w-4 items-center justify-center rounded-full bg-primary font-normal text-white shadow-subtle-hard ring-2 ring-white ring-opacity-90">
                      <Link size={12} color="white" />
                    </div>
                  </div>
                  <span
                    className="w-full max-w-full flex-1 flex-row truncate whitespace-nowrap pr-16"
                    title={`${props?.folder ? (props as any).folder.plainName : ''}${
                      !props.folder && (props.file as DriveFileData)?.type
                        ? `.${(props.file as DriveFileData)?.type}`
                        : ''
                    }`}
                  >
                    {`${props?.folder ? (props as any).folder.plainName : ''}${
                      !props.folder && (props.file as DriveFileData)?.type
                        ? `.${(props.file as DriveFileData)?.type}`
                        : ''
                    }`}
                  </span>
                </div>
              );
            },
            (props) => (
              // TODO: ADD HERE OWNER OF SHARED ITEM
              <span
                className={`${isItemSelected(props) ? 'text-gray-100' : 'text-gray-60'}`}
              >{`${props.ownerId}`}</span>
            ),
            (props) =>
              props.folder ? (
                <span className="opacity-25">—</span>
              ) : (
                <span>{`${sizeService.bytesToString(props?.fileSize ? props.fileSize : 0, false)}`}</span>
              ),
            (props) => (
              <span className={`${isItemSelected(props) ? 'text-gray-100' : 'text-gray-60'}`}>
                {dateService.format(props.createdAt, 'D MMM YYYY')}
              </span>
            ),
          ]}
          skinSkeleton={skinSkeleton}
          emptyState={emptyState}
          onNextPage={onNextPage}
          hasMoreItems={hasMoreItems}
          menu={
            selectedItems.length > 1
              ? contextMenuMultipleSharedView({
                  deleteLink: () => setIsDeleteDialogModalOpen(true),
                  downloadItem: () => {
                    const itemsToDownload = selectedItems.map((selectedShareLink) => ({
                      ...(selectedShareLink.item as DriveItemData),
                      isFolder: selectedShareLink.isFolder,
                    }));
                    dispatch(storageThunks.downloadItemsThunk(itemsToDownload));
                  },
                  moveToTrash: moveSelectedItemsToTrash,
                })
              : selectedItems[0]?.isFolder
              ? contextMenuDriveFolderShared({
                  copyLink,
                  deleteLink: () => setIsDeleteDialogModalOpen(true),
                  openShareAccessSettings,
                  renameItem: renameItem,
                  moveItem: moveItem,
                  downloadItem: downloadItem,
                  moveToTrash: moveToTrash,
                })
              : contextMenuDriveItemShared({
                  openPreview: (shareLink) => {
                    dispatch(uiActions.setIsFileViewerOpen(true));
                    dispatch(uiActions.setFileViewerItem((shareLink as any).item as DriveItemData));
                  },
                  copyLink,
                  deleteLink: () => setIsDeleteDialogModalOpen(true),
                  openShareAccessSettings,
                  renameItem: renameItem,
                  moveItem: moveItem,
                  downloadItem: downloadItem,
                  moveToTrash: moveToTrash,
                })
          }
          keyBoardShortcutActions={{
            onBackspaceKeyPressed: moveSelectedItemsToTrash,
            onRKeyPressed: () => {
              if (selectedItems.length === 1) {
                const selectedItem = selectedItems[0];
                const itemToRename = {
                  ...((selectedItem as any).item as DriveItemData),
                  isFolder: selectedItem.isFolder,
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
        items={shareLinks.map((shareLink) => ({ ...(shareLink.item as DriveItemData), isFolder: shareLink.isFolder }))}
        isTrash={false}
      />
      <EditFolderNameDialog />
      {isShareDialogOpen && <ShareDialog />}
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
