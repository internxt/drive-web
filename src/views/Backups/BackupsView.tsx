import { useState } from 'react';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import BreadcrumbsBackupsView from 'app/shared/components/Breadcrumbs/Containers/BreadcrumbsBackupsView';
import { useAppDispatch, useAppSelector } from 'app/store/hooks';
import { Helmet } from 'react-helmet-async';
import DeleteBackupDialog from 'app/drive/components/DeleteBackupDialog/DeleteBackupDialog';
import WarningMessageWrapper from 'app/drive/components/WarningMessage/WarningMessageWrapper';
import BackupsAsFoldersList from './components/BackupsAsFoldersList';
import DeviceList from './components/DeviceList';
import FileViewerWrapper from 'app/drive/components/FileViewer/FileViewerWrapper';
import newStorageService from 'app/drive/services/new-storage.service';
import { deleteFile } from 'app/drive/services/file.service';
import { deleteItemsThunk } from 'app/store/slices/storage/storage.thunks/deleteItemsThunk';
import { DriveItemData } from 'app/drive/types';
import { DriveFolderData } from '@internxt/sdk/dist/drive/storage/types';
import { contextMenuSelectedBackupItems } from 'app/drive/components/DriveExplorer/DriveExplorerList/DriveItemContextMenu';
import { useBackupListActions } from './hooks/useBackupListActions';
import { useBackupDeviceActions } from './hooks/useBackupDeviceActions';
import { useBackupsPagination } from './hooks/useBackupsPagination';
import errorService from 'app/core/services/error.service';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';
import { Dialog, MenuItemType } from '@internxt/ui';
import { DownloadManager } from 'app/network/DownloadManager';
import workspacesSelectors from 'app/store/slices/workspaces/workspaces.selectors';

export default function BackupsView(): JSX.Element {
  const { translate } = useTranslationContext();
  const dispatch = useAppDispatch();
  const isLoadingDevices = useAppSelector((state) => state.backups.isLoadingDevices);
  const devices = useAppSelector((state) => state.backups.devices);
  const currentDevice = useAppSelector((state) => state.backups.currentDevice);
  const selectedWorkspace = useAppSelector(workspacesSelectors.getSelectedWorkspace);
  const workspaceCredentials = useAppSelector(workspacesSelectors.getWorkspaceCredentials);
  const [foldersInBreadcrumbs, setFoldersInBreadcrumbs] = useState<DriveFolderData[]>([]);

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
    goToFolder,
    goToFolderRoot,
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

  const onDeleteSelectedItems = async () => {
    const selectedItemsIDs = new Set(selectedItems.map((item) => item.id));
    const filteredCurrentItems = currentItems.filter((item) => !selectedItemsIDs.has(item.id));
    try {
      const deletePromises = selectedItems.map((item) =>
        item.isFolder ? newStorageService.deleteFolderByUuid(item.uuid) : deleteFile(item),
      );
      await Promise.all(deletePromises);
      dispatch(deleteItemsThunk(selectedItems));
      clearSelectedItems();
      updateCurrentItemsList(filteredCurrentItems);
    } catch (error) {
      errorService.reportError(error);
      notificationsService.show({
        text: translate('notificationMessages.errorDeletingItems'),
        type: ToastType.Error,
      });
    }
  };

  const onDeleteFileItemFromFilePreview = async () => {
    try {
      if (isFileViewerOpen && itemToPreview) {
        await deleteFile(itemToPreview as DriveItemData);
        dispatch(deleteItemsThunk([itemToPreview as DriveItemData]));
      }
      clearSelectedItems();
      updateCurrentItemsList([itemToPreview] as DriveItemData[]);
      onCloseFileViewer();
    } catch (error) {
      errorService.reportError(error);
      notificationsService.show({
        text: translate('notificationMessages.errorDeletingItems'),
        type: ToastType.Error,
      });
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
      <DeleteBackupDialog backupsAsFoldersPath={foldersInBreadcrumbs} goToFolder={goToFolder} />
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
      />
      {itemToPreview && (
        <FileViewerWrapper
          file={itemToPreview}
          onClose={onCloseFileViewer}
          showPreview={isFileViewerOpen}
          folderItems={currentItems}
          contextMenu={contextMenuForFileViewer}
        />
      )}
      <div className="z-50 flex h-14 shrink-0 items-center px-5">
        {currentDevice ? (
          <BreadcrumbsBackupsView
            backupsAsFoldersPath={foldersInBreadcrumbs}
            goToFolder={goToFolder}
            goToFolderRoot={goToFolderRoot}
          />
        ) : (
          <p className="text-lg">{translate('backups.your-devices')}</p>
        )}
      </div>
      <WarningMessageWrapper />
      {body}
    </div>
  );
}
