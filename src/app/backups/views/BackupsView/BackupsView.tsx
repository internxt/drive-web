import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
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
import WarningMessageWrapper from '../../../drive/components/WarningMessage/WarningMessageWrapper';

export default function BackupsView(): JSX.Element {
  const { translate } = useTranslationContext();
  const dispatch = useAppDispatch();
  const isLoadingDevices = useAppSelector((state) => state.backups.isLoadingDevices);
  const devices = useAppSelector((state) => state.backups.devices);
  const currentDevice = useAppSelector((state) => state.backups.currentDevice);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedDevices, setSelectedDevices] = useState<(Device | DriveFolderData)[]>([]);
  const [backupsAsFoldersPath, setBackupsAsFoldersPath] = useState<DriveFolderData[]>([]);

  const onDeviceClicked = (target: Device | DriveFolderData) => {
    setSelectedDevices([]);
    dispatch(backupsActions.setCurrentDevice(target));
    if ('mac' in target) {
      dispatch(backupsThunks.fetchDeviceBackupsThunk(target.mac));
    }
  };

  const goBack = () => {
    setSelectedDevices([]);
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
    dispatch(backupsActions.setCurrentDevice(null));
    setBackupsAsFoldersPath([]);
    dispatch(backupsThunks.fetchDevicesThunk());
  }, []);

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
      icon: null,
      isFirstPath: true,
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
      className="flex w-full shrink-0 grow flex-col"
      onContextMenu={(e) => {
        e.preventDefault();
      }}
    >
      <Helmet>
        <title>{translate('sideNav.backups')} - Internxt Drive</title>
      </Helmet>
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
      <div className="z-50 flex h-14 shrink-0 items-center px-5">
        {currentDevice ? backupsBreadcrumbs : <p className="text-lg"> {translate('backups.your-devices')}</p>}
      </div>
      <WarningMessageWrapper />
      {body}
    </div>
  );
}
