import { DriveFolderData } from '@internxt/sdk/dist/drive/storage/types';
import { useTranslationContext } from '../../../i18n/provider/TranslationProvider';
import BreadcrumbsBackupsView from '../../../shared/components/Breadcrumbs/Containers/BreadcrumbsBackupsView';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { backupsActions, backupsThunks } from '../../../store/slices/backups';
import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import DeleteBackupDialog from '../../../drive/components/DeleteBackupDialog/DeleteBackupDialog';
import WarningMessageWrapper from '../../../drive/components/WarningMessage/WarningMessageWrapper';
import { deleteBackupDeviceAsFolder } from '../../../drive/services/folder.service';
import { DriveItemData, DriveFolderData as DriveWebFolderData } from '../../../drive/types';
import Dialog from '../../../shared/components/Dialog/Dialog';
import { deleteItemsThunk } from '../../../store/slices/storage/storage.thunks/deleteItemsThunk';
import BackupsAsFoldersList from '../../components/BackupsAsFoldersList/BackupsAsFoldersList';
import DeviceList from '../../components/DeviceList/DeviceList';
import { Device } from '../../types';
import newStorageService from 'app/drive/services/new-storage.service';
import _ from 'lodash';
import { contextMenuSelectedBackupItems } from '../../../drive/components/DriveExplorer/DriveExplorerList/DriveItemContextMenu';
import { downloadItemsThunk } from '../../../store/slices/storage/storage.thunks/downloadItemsThunk';
import { deleteFile } from '../../../drive/services/file.service';
import { ListItemMenu } from '../../../shared/components/List/ListItem';
import { uiActions } from '../../../store/slices/ui';

const DEFAULT_LIMIT = 50;

export default function BackupsView(): JSX.Element {
  const { translate } = useTranslationContext();
  const dispatch = useAppDispatch();
  const isLoadingDevices = useAppSelector((state) => state.backups.isLoadingDevices);
  const devices = useAppSelector((state) => state.backups.devices);
  const currentDevice = useAppSelector((state) => state.backups.currentDevice);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedDevices, setSelectedDevices] = useState<(Device | DriveFolderData)[]>([]);
  const [backupsAsFoldersPath, setBackupsAsFoldersPath] = useState<DriveFolderData[]>([]);
  const [folderUuid, setFolderUuid] = useState<string>();
  const [isLoading, setIsLoading] = useState(true);
  const [currentItems, setCurrentItems] = useState<DriveItemData[]>([]);
  const [selectedItems, setSelectedItems] = useState<DriveItemData[]>([]);
  const [hasMoreItems, setHasMoreItems] = useState<boolean>(true);
  const [offset, setOffset] = useState<number>(0);

  useEffect(() => {
    dispatch(backupsActions.setCurrentDevice(null));
    setBackupsAsFoldersPath([]);
    setFolderUuid(undefined);
    dispatch(backupsThunks.fetchDevicesThunk());
  }, []);

  useEffect(() => {
    if (currentDevice && !('mac' in currentDevice)) {
      setBackupsAsFoldersPath([currentDevice]);
      setFolderUuid(currentDevice.uuid);
    }
  }, [currentDevice]);

  useEffect(() => {
    refreshFolderContent();
  }, [folderUuid]);

  function goToFolder(folderId: number, folderUuid?: string) {
    setBackupsAsFoldersPath((current) => {
      const index = current.findIndex((i) => i.id === folderId);
      return current.slice(0, index + 1);
    });

    if (folderUuid) {
      setFolderUuid(folderUuid);
    }
  }

  const goToRootFolder = () => {
    setSelectedDevices([]);
    setFolderUuid(undefined);
    dispatch(backupsActions.setCurrentDevice(null));
  };

  const onDeviceClicked = (target: Device | DriveFolderData) => {
    setSelectedDevices([]);
    dispatch(backupsActions.setCurrentDevice(target));
    if ('mac' in target) {
      dispatch(backupsThunks.fetchDeviceBackupsThunk(target.mac));
    }
  };

  const onOpenDeleteModal = (targets: (Device | DriveFolderData)[]) => {
    setSelectedDevices((values) => [...values, ...targets]);
    setIsDeleteModalOpen(true);
  };

  const onDevicesSelected = (changes: { device: Device | DriveFolderData; isSelected: boolean }[]) => {
    let updatedSelectedItems = selectedDevices;
    for (const change of changes) {
      updatedSelectedItems = updatedSelectedItems.filter((item) => item.id !== change.device.id);
      if (change.isSelected) {
        updatedSelectedItems = [...updatedSelectedItems, change.device];
      }
    }
    setSelectedDevices(updatedSelectedItems);
  };

  const onConfirmDelete = async () => {
    for (const selectedDevice of selectedDevices) {
      if (selectedDevice && 'mac' in selectedDevice) {
        dispatch(backupsThunks.deleteDeviceThunk(selectedDevice));
      } else {
        await dispatch(deleteItemsThunk([selectedDevice as DriveItemData])).unwrap();
        await deleteBackupDeviceAsFolder(selectedDevice as DriveWebFolderData);
        dispatch(backupsThunks.fetchDevicesThunk());
      }
    }
    onCloseDeleteModal();
  };

  const onCloseDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setSelectedDevices([]);
  };

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
      setCurrentItems((items) => items.filter((i) => !(i.id === item.id && i.isFolder === item.isFolder)));
    }
    dispatch(deleteItemsThunk(selectedItems));
  }

  const contextMenu: ListItemMenu<DriveItemData> = contextMenuSelectedBackupItems({
    onDownloadSelectedItems,
    onDeleteSelectedItems: onDeleteSelectedItems,
  });

  const onItemClicked = (item: DriveItemData) => {
    if (item.isFolder) {
      if (!isLoading) {
        setIsLoading(true);
        setBackupsAsFoldersPath((current) => [...current, item]);
        dispatch(backupsActions.setCurrentFolder(item));
        setFolderUuid(item.uuid);
      }
    } else {
      dispatch(uiActions.setIsFileViewerOpen(true));
      dispatch(uiActions.setFileViewerItem(item));
    }
  };

  const onSelectedItemsChanged = (changes: { props: DriveItemData; value: boolean }[]) => {
    const selectedDevicesParsed = changes.map((change) => ({
      device: change.props,
      isSelected: change.value,
    }));
    onItemSelected(selectedDevicesParsed);
  };

  const onItemSelected = (changes: { device: DriveItemData; isSelected: boolean }[]) => {
    let updatedSelectedItems = selectedItems;

    for (const change of changes) {
      updatedSelectedItems = updatedSelectedItems.filter((item) => item.id !== change.device.id);
      if (change.isSelected) {
        updatedSelectedItems = [...updatedSelectedItems, change.device];
      }
    }
    setSelectedItems(updatedSelectedItems);
  };

  async function refreshFolderContent() {
    setIsLoading(true);
    setOffset(0);
    setSelectedItems([]);
    setCurrentItems([]);

    if (!folderUuid) return;

    const [folderContentPromise] = newStorageService.getFolderContentByUuid({
      folderUuid,
      limit: DEFAULT_LIMIT,
      offset: 0,
    });

    const response = await folderContentPromise;
    const files = response.files.map((file) => ({ ...file, isFolder: false, name: file.plainName }));
    const folders = response.children.map((folder) => ({ ...folder, isFolder: true, name: folder.plainName }));
    const items = _.concat(folders as DriveItemData[], files as DriveItemData[]);

    setCurrentItems(items);

    if (items.length >= DEFAULT_LIMIT) {
      setHasMoreItems(true);
      setOffset(DEFAULT_LIMIT);
    } else {
      setHasMoreItems(false);
    }

    setIsLoading(false);
  }

  const getPaginatedBackupList = async () => {
    if (!folderUuid || !hasMoreItems) return;

    setIsLoading(true);

    const [folderContentPromise] = newStorageService.getFolderContentByUuid({
      folderUuid,
      limit: DEFAULT_LIMIT,
      offset,
    });

    const folderContentResponse = await folderContentPromise;
    const files = folderContentResponse.files.map((file) => ({ ...file, isFolder: false, name: file.plainName }));
    const folders = folderContentResponse.children.map((folder) => ({
      ...folder,
      isFolder: true,
      name: folder.plainName,
    }));
    const items = _.concat(folders as DriveItemData[], files as DriveItemData[]);

    const totalCurrentItems = _.concat(currentItems, items);

    setCurrentItems(totalCurrentItems);

    if (items.length >= DEFAULT_LIMIT) {
      setHasMoreItems(true);
      setOffset((prevOffset) => prevOffset + DEFAULT_LIMIT);
    } else {
      setHasMoreItems(false);
    }

    setIsLoading(false);
  };

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
  } else if (backupsAsFoldersPath.length) {
    body = (
      <BackupsAsFoldersList
        contextMenu={contextMenu}
        currentItems={currentItems}
        selectedItems={selectedItems}
        hasMoreItems={hasMoreItems}
        isLoading={isLoading}
        getPaginatedBackupList={getPaginatedBackupList}
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
      <DeleteBackupDialog backupsAsFoldersPath={backupsAsFoldersPath} goToFolder={goToFolder} />
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
      <div className="z-50 flex h-14 shrink-0 items-center px-5">
        {currentDevice ? (
          <BreadcrumbsBackupsView
            backupsAsFoldersPath={backupsAsFoldersPath}
            goToFolder={goToFolder}
            goToRootFolder={goToRootFolder}
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
