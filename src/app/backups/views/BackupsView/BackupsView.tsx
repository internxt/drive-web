import { useState } from 'react';
import { useTranslationContext } from '../../../i18n/provider/TranslationProvider';
import BreadcrumbsBackupsView from '../../../shared/components/Breadcrumbs/Containers/BreadcrumbsBackupsView';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { Helmet } from 'react-helmet-async';
import DeleteBackupDialog from '../../../drive/components/DeleteBackupDialog/DeleteBackupDialog';
import WarningMessageWrapper from '../../../drive/components/WarningMessage/WarningMessageWrapper';
import Dialog from '../../../shared/components/Dialog/Dialog';
import BackupsAsFoldersList from '../../components/BackupsAsFoldersList/BackupsAsFoldersList';
import DeviceList from '../../components/DeviceList/DeviceList';
import FileViewerWrapper from '../../../drive/components/FileViewer/FileViewerWrapper';
import { downloadItemsThunk } from '../../../store/slices/storage/storage.thunks/downloadItemsThunk';
import { deleteBackupDeviceAsFolder } from '../../../drive/services/folder.service';
import { deleteFile } from '../../../drive/services/file.service';
import { deleteItemsThunk } from '../../../store/slices/storage/storage.thunks/deleteItemsThunk';
import { DriveFolderData as DriveWebFolderData, DriveItemData } from '../../../drive/types';
import { DriveFolderData } from '@internxt/sdk/dist/drive/storage/types';
import { contextMenuSelectedBackupItems } from '../../../drive/components/DriveExplorer/DriveExplorerList/DriveItemContextMenu';
import { useBackupListActions } from 'app/backups/hooks/useBackupListActions';
import { useBackupDeviceActions } from 'app/backups/hooks/useBackupDeviceActions';
import { useBackupsPagination } from 'app/backups/hooks/useBackupsPagination';
import errorService from 'app/core/services/error.service';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';
import { MenuItemType } from '@internxt/ui';

export default function BackupsView(): JSX.Element {
  const { translate } = useTranslationContext();
  const dispatch = useAppDispatch();
  const isLoadingDevices = useAppSelector((state) => state.backups.isLoadingDevices);
  const devices = useAppSelector((state) => state.backups.devices);
  const currentDevice = useAppSelector((state) => state.backups.currentDevice);
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
    dispatch(downloadItemsThunk(selectedItems));
  };

  const onDownloadFileFormFileViewer = () => {
    if (itemToPreview && isFileViewerOpen) dispatch(downloadItemsThunk([itemToPreview as DriveItemData]));
  };

  const onDeleteSelectedItems = async () => {
    const selectedItemsIDs = new Set(selectedItems.map((item) => item.id));
    const filteredCurrentItems = currentItems.filter((item) => !selectedItemsIDs.has(item.id));
    try {
      const deletePromises = selectedItems.map((item) =>
        item.isFolder ? deleteBackupDeviceAsFolder(item as DriveWebFolderData) : deleteFile(item),
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
