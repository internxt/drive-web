import { useEffect, useState } from 'react';
import UilHdd from '@iconscout/react-unicons/icons/uil-hdd';

import DeviceList from '../../components/DeviceList/DeviceList';
import i18n from 'app/i18n/services/i18n.service';
import { Device } from '../../types';
import BackupsList from '../../components/BackupList/BackupList';
import Breadcrumbs, { BreadcrumbItemData } from 'app/shared/components/Breadcrumbs/Breadcrumbs';
import { backupsActions, backupsThunks } from 'app/store/slices/backups';
import { useAppDispatch, useAppSelector } from 'app/store/hooks';
import { DriveFolderData } from '@internxt/sdk/dist/drive/storage/types';
import BackupsAsFoldersList from '../../components/BackupsAsFoldersList/BackupsAsFoldersList';
import { deleteItemsThunk } from '../../../store/slices/storage/storage.thunks/deleteItemsThunk';
import { DriveFolderData as DriveWebFolderData, DriveItemData } from '../../../drive/types';
import { deleteBackupDeviceAsFolder } from '../../../drive/services/folder.service';
import Dialog from '../../../shared/components/Dialog/Dialog';
import DeleteBackupDialog from '../../../drive/components/DeleteBackupDialog/DeleteBackupDialog';

export default function BackupsView(): JSX.Element {
  const dispatch = useAppDispatch();
  const isLoadingDevices = useAppSelector((state) => state.backups.isLoadingDevices);
  const isLoadingDeviceBackups = useAppSelector((state) => state.backups.isLoadingDeviceBackups);
  const devices = useAppSelector((state) => state.backups.devices);
  const currentDeviceBackups = useAppSelector((state) => state.backups.backups);
  const currentDevice = useAppSelector((state) => state.backups.currentDevice);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedDevices, setSelectedDevices] = useState<Device | DriveFolderData>();

  const onDeviceSelected = (target: Device | DriveFolderData) => {
    dispatch(backupsActions.setCurrentDevice(target));
    if ('mac' in target) {
      dispatch(backupsThunks.fetchDeviceBackupsThunk(target.mac));
    }
  };
  const goBack = () => {
    dispatch(backupsActions.setCurrentDevice(null));
  };

  const onOpenDeleteModal = (target: Device | DriveFolderData) => {
    setSelectedDevices(target);
    setIsDeleteModalOpen(true);
  };

  const onConfirmDelete = async () => {
    if (selectedDevices && 'mac' in selectedDevices) dispatch(backupsThunks.deleteDeviceThunk(selectedDevices));
    else {
      await dispatch(deleteItemsThunk([selectedDevices as DriveItemData])).unwrap();
      await deleteBackupDeviceAsFolder(selectedDevices as DriveWebFolderData);
      dispatch(backupsThunks.fetchDevicesThunk());
    }
    onCloseDeleteModal();
  };

  const onCloseDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setSelectedDevices(undefined);
  };

  useEffect(() => {
    dispatch(backupsThunks.fetchDevicesThunk());
  }, []);

  const [backupsAsFoldersPath, setBackupsAsFoldersPath] = useState<DriveFolderData[]>([]);
  useEffect(() => {
    if (currentDevice && !('mac' in currentDevice)) setBackupsAsFoldersPath([currentDevice]);
  }, [currentDevice]);

  function goToFolder(folderId: number) {
    setBackupsAsFoldersPath((current) => {
      const index = current.findIndex((i) => i.id === folderId);
      return current.slice(0, index + 1);
    });
  }

  const breadcrumbsItems: BreadcrumbItemData[] = [
    {
      id: -1,
      label: 'Devices',
      icon: <UilHdd className="mr-1 h-4 w-4" />,
      active: true,
      onClick: () => goBack(),
    },
  ];
  if (currentDevice && 'mac' in currentDevice) {
    breadcrumbsItems.push({
      id: currentDevice.id,
      label: currentDevice.name,
      icon: null,
      active: false,
      isBackup: true,
    });
  } else if (currentDevice) {
    backupsAsFoldersPath.forEach((item, i) => {
      const clickableOptions = {
        active: true,
        onClick: () => goToFolder(item.id),
      };
      breadcrumbsItems.push({
        id: item.id,
        label: item.name,
        icon: null,
        isBackup: true,
        ...(i === backupsAsFoldersPath.length - 1 ? { active: false } : clickableOptions),
      });
    });
  }

  const backupsBreadcrumbs = <Breadcrumbs items={breadcrumbsItems} />;

  let body;

  if (!currentDevice) {
    body = (
      <DeviceList
        isLoading={isLoadingDevices}
        items={devices}
        onDeviceSelected={onDeviceSelected}
        onDeviceDeleted={onOpenDeleteModal}
      />
    );
  } else if (currentDevice && 'mac' in currentDevice) {
    body = <BackupsList isLoading={isLoadingDeviceBackups} items={currentDeviceBackups} />;
  } else if (backupsAsFoldersPath.length) {
    body = (
      <BackupsAsFoldersList
        onFolderPush={(folder) => setBackupsAsFoldersPath((current) => [...current, folder])}
        folderId={backupsAsFoldersPath[backupsAsFoldersPath.length - 1].id}
      />
    );
  }

  return (
    <div className="mb-5 flex flex-grow flex-col px-8 pt-6">
      <DeleteBackupDialog items={breadcrumbsItems} goToFolder={goToFolder} />
      <Dialog
        isOpen={isDeleteModalOpen}
        onClose={onCloseDeleteModal}
        onSecondaryAction={onCloseDeleteModal}
        onPrimaryAction={onConfirmDelete}
        secondaryAction="Cancel"
        primaryAction="Confirm"
        title="Are you sure?"
        subtitle="Your backup device will be deleted."
        primaryActionColor="danger"
      />
      <div className="flex items-baseline pb-4">
        {currentDevice ? backupsBreadcrumbs : <p className="px-3 py-1 text-lg"> {i18n.get('backups.your-devices')}</p>}
      </div>
      {body}
    </div>
  );
}
