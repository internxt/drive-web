import { useEffect, useState } from 'react';
import UilHdd from '@iconscout/react-unicons/icons/uil-hdd';

import DeviceList from '../../components/DeviceList/DeviceList';
import { Device } from '../../types';
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
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';

export default function BackupsView(): JSX.Element {
  const { translate } = useTranslationContext();
  const dispatch = useAppDispatch();
  const isLoadingDevices = useAppSelector((state) => state.backups.isLoadingDevices);
  const devices = useAppSelector((state) => state.backups.devices);
  const currentDevice = useAppSelector((state) => state.backups.currentDevice);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedDevices, setSelectedDevices] = useState<(Device | DriveFolderData)[]>([]);

  const onDeviceClicked = (target: Device | DriveFolderData) => {
    dispatch(backupsActions.setCurrentDevice(target));
    if ('mac' in target) {
      dispatch(backupsThunks.fetchDeviceBackupsThunk(target.mac));
    }
  };

  const goBack = () => {
    dispatch(backupsActions.setCurrentDevice(null));
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
      label: `${translate('backups.your-devices')}`,
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
        onDeviceSelected={onDevicesSelected}
        onDeviceDeleted={onOpenDeleteModal}
        onDeviceClicked={onDeviceClicked}
        selectedItems={selectedDevices}
      />
    );
  } else if (backupsAsFoldersPath.length) {
    body = (
      <BackupsAsFoldersList
        onFolderPush={(folder) => setBackupsAsFoldersPath((current) => [...current, folder])}
        folderId={backupsAsFoldersPath[backupsAsFoldersPath.length - 1].id}
      />
    );
  }

  return (
    <div
      className="flex flex-grow flex-col"
      onContextMenu={(e) => {
        e.preventDefault();
      }}
    >
      <DeleteBackupDialog items={breadcrumbsItems} goToFolder={goToFolder} />
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
      <div className="flex h-14 flex-shrink-0 items-center  px-5">
        {currentDevice ? backupsBreadcrumbs : <p className="text-lg"> {translate('backups.your-devices')}</p>}
      </div>
      {body}
    </div>
  );
}
