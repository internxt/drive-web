import { DriveFolderData } from '@internxt/sdk/dist/drive/storage/types';
import backupsService from '../services/backups.service';
import { DriveItemData, DriveFolderData as DriveWebFolderData } from 'app/drive/types';
import { AppDispatch } from 'app/store';
import { useAppSelector } from 'app/store/hooks';
import { backupsActions, backupsThunks } from '../store/backupsSlice';
import { deleteItemsThunk } from 'app/store/slices/storage/storage.thunks/deleteItemsThunk';
import { Dispatch, SetStateAction, useEffect, useState } from 'react';
import { Device } from '@internxt/sdk/dist/drive/backups/types';
import errorService from 'services/error.service';

export const useBackupDeviceActions = (
  onFolderUuidChanges: (folderUuid?: string) => void,
  onBreadcrumbFolderChanges: Dispatch<SetStateAction<DriveFolderData[]>>,
  dispatch: AppDispatch,
) => {
  const currentDevice = useAppSelector((state) => state.backups.currentDevice);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isLoadingDeleteModal, setIsLoadingDeleteModal] = useState(false);
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

  const goToRootFolder = () => {
    setSelectedDevices([]);
    onFolderUuidChanges(undefined);
    dispatch(backupsActions.setCurrentDevice(null));
  };

  const onDeviceClicked = (target: Device | DriveFolderData) => {
    setSelectedDevices([]);
    dispatch(backupsActions.setCurrentDevice(target));
    if ('mac' in target && target.mac) {
      dispatch(backupsThunks.fetchDeviceBackupsThunk(target.mac));
    }
  };

  const onOpenDeleteModal = (targets: (Device | DriveFolderData)[]) => {
    setSelectedDevices((values) => {
      const existingIds = new Set(values.map((v) => v.id));
      const newTargets = targets.filter((t) => !existingIds.has(t.id));
      return [...values, ...newTargets];
    });
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
    setIsLoadingDeleteModal(true);
    try {
      for (const selectedDevice of selectedDevices) {
        if (selectedDevice && 'mac' in selectedDevice) {
          await dispatch(backupsThunks.deleteDeviceThunk(selectedDevice)).unwrap();
        } else {
          await dispatch(deleteItemsThunk([selectedDevice as DriveItemData])).unwrap();
          await backupsService.deleteBackupDeviceAsFolder((selectedDevice as DriveWebFolderData).uuid);
          await dispatch(backupsThunks.fetchDevicesThunk());
        }
      }
    } catch (error) {
      errorService.reportError(error);
    } finally {
      setIsLoadingDeleteModal(false);
      onCloseDeleteModal();
    }
  };

  const onCloseDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setSelectedDevices([]);
  };

  return {
    isDeleteModalOpen,
    isLoadingDeleteModal,
    selectedDevices,
    goToFolder,
    goToRootFolder,
    onDeviceClicked,
    onOpenDeleteModal,
    onDevicesSelected,
    onConfirmDelete,
    onCloseDeleteModal,
  };
};
