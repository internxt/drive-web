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
import { useBackupsPagination } from 'hooks/backups/useBackupsPagination';
import { downloadItemsThunk } from '../../../store/slices/storage/storage.thunks/downloadItemsThunk';
import { deleteBackupDeviceAsFolder } from '../../../drive/services/folder.service';
import { deleteFile } from '../../../drive/services/file.service';
import { deleteItemsThunk } from '../../../store/slices/storage/storage.thunks/deleteItemsThunk';
import { ListItemMenu } from '../../../shared/components/List/ListItem';
import { DriveFolderData as DriveWebFolderData, DriveItemData } from '../../../drive/types';
import { DriveFolderData } from '@internxt/sdk/dist/drive/storage/types';
import { contextMenuSelectedBackupItems } from '../../../drive/components/DriveExplorer/DriveExplorerList/DriveItemContextMenu';
import { useBackupListActions } from 'hooks/backups/useBackupListActions';
import { useBackupDeviceActions } from 'hooks/backups/useBackupDeviceActions';

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

  const { currentItems, areFetchingItems, hasMoreItems, getMorePaginatedItems, getFolderContent } =
    useBackupsPagination(folderUuid, clearSelectedItems);

  const onDownloadSelectedItems = () => {
    dispatch(downloadItemsThunk(selectedItems));
  };

  async function onDeleteSelectedItems() {
    for (const item of selectedItems) {
      if (item.isFolder) {
        await deleteBackupDeviceAsFolder(item as DriveWebFolderData);
      } else {
        await deleteFile(item);
      }
    }
    dispatch(deleteItemsThunk(selectedItems));

    if (isFileViewerOpen) {
      onCloseFileViewer();
    }

    onSelectedItemsChanged([]);
    await getFolderContent();
  }

  const contextMenu: ListItemMenu<DriveItemData> = contextMenuSelectedBackupItems({
    onDownloadSelectedItems,
    onDeleteSelectedItems: onDeleteSelectedItems,
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
          contextMenu={contextMenu}
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
