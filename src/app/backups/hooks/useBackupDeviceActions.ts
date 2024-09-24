import { DriveFolderData } from '@internxt/sdk/dist/drive/storage/types';
import { Device } from 'app/backups/types';
import { deleteBackupDeviceAsFolder } from 'app/drive/services/folder.service';
import { DriveItemData, DriveFolderData as DriveWebFolderData } from 'app/drive/types';
import { AppDispatch } from 'app/store';
import { useAppSelector } from 'app/store/hooks';
import { backupsActions, backupsThunks } from 'app/store/slices/backups';
import { deleteItemsThunk } from 'app/store/slices/storage/storage.thunks/deleteItemsThunk';
import { Dispatch, SetStateAction, useEffect, useState } from 'react';

export const useBackupDeviceActions = (
  onFolderUuidChanges: (folderUuid?: string) => void,
  onBreadcrumbFolderChanges: Dispatch<SetStateAction<DriveFolderData[]>>,
  dispatch: AppDispatch,
) => {
  const currentDevice = useAppSelector((state) => state.backups.currentDevice);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedDevices, setSelectedDevices] = useState<(Device | DriveFolderData)[]>([]);

  useEffect(() => {
    dispatch(backupsActions.setCurrentDevice(null));
    onBreadcrumbFolderChanges([]);
    onFolderUuidChanges(undefined);
    dispatch(backupsThunks.fetchDevicesThunk());
  }, []);

  useEffect(() => {
    if (currentDevice && !('mac' in currentDevice)) {
      onBreadcrumbFolderChanges([currentDevice]);
      onFolderUuidChanges(currentDevice.uuid);
    }
  }, [currentDevice]);

  function goToFolder(folderId: number, folderUuid?: string) {
    onBreadcrumbFolderChanges((current) => {
      const index = current.findIndex((i) => i.id === folderId);
      return current.slice(0, index + 1);
    });

    if (folderUuid) {
      onFolderUuidChanges(folderUuid);
    }
  }

  const goToFolderRoot = () => {
    setSelectedDevices([]);
    onFolderUuidChanges(undefined);
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

  return {
    isDeleteModalOpen,
    selectedDevices,
    goToFolder,
    goToFolderRoot,
    onDeviceClicked,
    onOpenDeleteModal,
    onDevicesSelected,
    onConfirmDelete,
    onCloseDeleteModal,
  };
};
