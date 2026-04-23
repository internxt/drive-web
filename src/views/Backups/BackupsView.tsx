import { Dialog, MenuItemType } from '@internxt/ui';
import FileViewerWrapper from 'app/drive/components/FileViewer/FileViewerWrapper';
import { deleteFile } from 'app/drive/services/file.service';
import newStorageService from 'app/drive/services/new-storage.service';
import { DriveFolderData, DriveItemData } from 'app/drive/types';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import { DownloadManager } from 'app/network/DownloadManager';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';
import { useAppDispatch, useAppSelector } from 'app/store/hooks';
import { deleteItemsThunk } from 'app/store/slices/storage/storage.thunks/deleteItemsThunk';
import workspacesSelectors from 'app/store/slices/workspaces/workspaces.selectors';
import BreadcrumbsBackupsView from 'components/BreadcrumbsBackupsView';
import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import errorService from 'services/error.service';
import { contextMenuSelectedBackupItems } from 'views/Drive/components/DriveExplorer/components';
import WarningMessageWrapper from 'views/Home/components/WarningMessageWrapper';
import { DeleteBackupDialog } from './components';
import BackupsAsFoldersList from './components/BackupsAsFoldersList';
import DeviceList from './components/DeviceList';
import { useBackupDeviceActions } from './hooks/useBackupDeviceActions';
import { useBackupListActions } from './hooks/useBackupListActions';
import { useBackupsPagination } from './hooks/useBackupsPagination';

export default function BackupsView(): JSX.Element {
  const { translate } = useTranslationContext();
  const dispatch = useAppDispatch();
  const isLoadingDevices = useAppSelector((state) => state.backups.isLoadingDevices);
  const devices = useAppSelector((state) => state.backups.devices);
  const currentDevice = useAppSelector((state) => state.backups.currentDevice);
  const selectedWorkspace = useAppSelector(workspacesSelectors.getSelectedWorkspace);
  const workspaceCredentials = useAppSelector(workspacesSelectors.getWorkspaceCredentials);
  const [foldersInBreadcrumbs, setFoldersInBreadcrumbs] = useState<DriveFolderData[]>([]);
  const [pendingDeleteItems, setPendingDeleteItems] = useState<DriveItemData[]>([]);
  const [isDeleteItemsDialogOpen, setIsDeleteItemsDialogOpen] = useState(false);
  const [isDeletingItems, setIsDeletingItems] = useState(false);

  const {
    folderUuid,
    isFileViewerOpen,
    itemToPreview,
    selectedItems,
    onFolderUuidChanges,
    clearSelectedItems,
    onCloseFileViewer,
    onItemSelected,
    onItemClicked,
    onSelectedItemsChanged,
  } = useBackupListActions(setFoldersInBreadcrumbs, dispatch);

  const {
    selectedDevices,
    isDeleteModalOpen,
    isLoadingDeleteModal,
    goToFolder,
    goToRootFolder,
    onConfirmDelete,
    onDeviceClicked,
    onDevicesSelected,
    onOpenDeleteModal,
    onCloseDeleteModal,
  } = useBackupDeviceActions(onFolderUuidChanges, setFoldersInBreadcrumbs, dispatch);

  const { currentItems, areFetchingItems, hasMoreItems, getMorePaginatedItems, updateCurrentItemsList } =
    useBackupsPagination(folderUuid, clearSelectedItems);

  const onDownloadSelectedItems = () => {
    DownloadManager.downloadItem({
      payload: selectedItems,
      selectedWorkspace,
      workspaceCredentials,
    });
  };

  const onDownloadFileFormFileViewer = () => {
    if (itemToPreview && isFileViewerOpen) {
      DownloadManager.downloadItem({
        payload: [itemToPreview as DriveItemData],
        selectedWorkspace,
        workspaceCredentials,
      });
    }
  };

  const openDeleteItemsDialog = (items: DriveItemData[]) => {
    if (!items.length) {
      return;
    }

    setPendingDeleteItems(items);
    setIsDeleteItemsDialogOpen(true);
  };

  const onCloseDeleteItemsDialog = () => {
    setIsDeleteItemsDialogOpen(false);
    setPendingDeleteItems([]);
  };

  const performDeleteItems = async (items: DriveItemData[]): Promise<boolean> => {
    if (!items.length) {
      return false;
    }

    setIsDeletingItems(true);
    const itemIdsToDelete = new Set(items.map((item) => item.id));
    const filteredCurrentItems = currentItems.filter((item) => !itemIdsToDelete.has(item.id));

    const isViewerItemBeingDeleted = isFileViewerOpen && itemToPreview && itemIdsToDelete.has(itemToPreview.id);

    try {
      const deletePromises = items.map((item) =>
        item.isFolder ? newStorageService.deleteFolderByUuid(item.uuid) : deleteFile(item),
      );
      await Promise.all(deletePromises);
      dispatch(deleteItemsThunk(items));
      clearSelectedItems();
      updateCurrentItemsList(filteredCurrentItems);

      if (isViewerItemBeingDeleted) {
        onCloseFileViewer();
      }

      return true;
    } catch (error) {
      errorService.reportError(error);
      const castedError = errorService.castError(error);
      notificationsService.show({
        text: translate('notificationMessages.errorDeletingItems'),
        type: ToastType.Error,
        requestId: castedError.requestId,
      });
      return false;
    } finally {
      setIsDeletingItems(false);
    }
  };

  const onDeleteSelectedItems = async () => {
    openDeleteItemsDialog(selectedItems);
  };

  const onDeleteFileItemFromFilePreview = async () => {
    if (!itemToPreview || !isFileViewerOpen) {
      return;
    }

    openDeleteItemsDialog([itemToPreview as DriveItemData]);
  };

  const onConfirmDeleteItems = async () => {
    if (!pendingDeleteItems.length) {
      onCloseDeleteItemsDialog();
      return;
    }

    const isDeleteSuccessful = await performDeleteItems(pendingDeleteItems);

    if (isDeleteSuccessful) {
      onCloseDeleteItemsDialog();
    }
  };

  const contextMenu: Array<MenuItemType<DriveItemData>> = contextMenuSelectedBackupItems({
    onDownloadSelectedItems,
    onDeleteSelectedItems: onDeleteSelectedItems,
  });

  const contextMenuForFileViewer: Array<MenuItemType<DriveItemData>> = contextMenuSelectedBackupItems({
    onDownloadSelectedItems: onDownloadFileFormFileViewer,
    onDeleteSelectedItems: onDeleteFileItemFromFilePreview,
  });

  let body;

  if (!currentDevice) {
    body = (
      <DeviceList
        isLoading={isLoadingDevices}
        items={devices}
        onDeviceSelected={onDevicesSelected}
        onDeviceDeleted={onOpenDeleteModal}
        onDeviceClicked={onDeviceClicked}
        selectedItems={selectedDevices}
      />
    );
  } else if (foldersInBreadcrumbs.length) {
    body = (
      <BackupsAsFoldersList
        contextMenu={contextMenu}
        currentItems={currentItems}
        selectedItems={selectedItems}
        hasMoreItems={hasMoreItems}
        isLoading={areFetchingItems}
        getPaginatedBackupList={getMorePaginatedItems}
        onItemClicked={onItemClicked}
        onItemSelected={onItemSelected}
        onSelectedItemsChanged={onSelectedItemsChanged}
      />
    );
  }

  return (
    <div
      role="none"
      className="flex w-full shrink-0 grow flex-col"
      onContextMenu={(e) => {
        e.preventDefault();
      }}
    >
      <Helmet>
        <title>{translate('sideNav.backups')} - Internxt Drive</title>
      </Helmet>
      <DeleteBackupDialog
        backupsAsFoldersPath={foldersInBreadcrumbs}
        goToFolder={goToFolder}
        goToRootFolder={goToRootFolder}
      />
      <Dialog
        isOpen={isDeleteModalOpen}
        onClose={onCloseDeleteModal}
        onSecondaryAction={onCloseDeleteModal}
        onPrimaryAction={onConfirmDelete}
        title={translate('modals.deleteBackupModal.title')}
        subtitle={translate('modals.deleteBackupModal.subtitle')}
        primaryAction={translate('modals.deleteBackupModal.primaryAction')}
        secondaryAction={translate('modals.deleteBackupModal.secondaryAction')}
        primaryActionColor="danger"
        isLoading={isLoadingDeleteModal}
      />
      <div className="z-[60]">
        <Dialog
          isOpen={isDeleteItemsDialogOpen}
          onClose={onCloseDeleteItemsDialog}
          onSecondaryAction={onCloseDeleteItemsDialog}
          onPrimaryAction={onConfirmDeleteItems}
          title={translate('drive.deleteItems.title')}
          subtitle={translate('drive.deleteItems.advice')}
          primaryAction={translate('drive.deleteItems.accept')}
          secondaryAction={translate('actions.cancel')}
          primaryActionColor="danger"
          isLoading={isDeletingItems}
        />
      </div>
      {itemToPreview && (
        <FileViewerWrapper
          file={itemToPreview}
          onClose={onCloseFileViewer}
          showPreview={isFileViewerOpen}
          folderItems={currentItems}
          contextMenu={contextMenuForFileViewer}
        />
      )}
      <div className="flex h-14 shrink-0 items-center px-5">
        {currentDevice ? (
          <div className="flex z-10">
            <BreadcrumbsBackupsView
              backupsAsFoldersPath={foldersInBreadcrumbs}
              goToFolder={goToFolder}
              goToRootFolder={goToRootFolder}
            />
          </div>
        ) : (
          <p className="text-lg">{translate('backups.your-devices')}</p>
        )}
      </div>
      <WarningMessageWrapper />
      {body}
    </div>
  );
}
