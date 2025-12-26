import errorService from 'services/error.service';
import { uiActions } from 'app/store/slices/ui';
import { useAppDispatch, useAppSelector } from 'app/store/hooks';
import { RootState } from 'app/store';
import { DriveFolderData as DriveWebFolderData, DriveItemData } from 'app/drive/types';
import { deleteItemsThunk } from 'app/store/slices/storage/storage.thunks/deleteItemsThunk';
import { backupsThunks } from '../store/backupsSlice';
import { DriveFolderData } from '@internxt/sdk/dist/drive/storage/types';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import { useState } from 'react';
import { Dialog } from '@internxt/ui';
import backupsService from '../services/backups.service';

interface DeleteBackupDialogProps {
  backupsAsFoldersPath: DriveFolderData[];
  goToFolder: (folderId: number) => void;
  goToRootFolder: () => void;
}

const DeleteBackupDialog = (props: DeleteBackupDialogProps): JSX.Element => {
  const { translate } = useTranslationContext();
  const dispatch = useAppDispatch();
  const isOpen = useAppSelector((state: RootState) => state.ui.isDeleteBackupDialogOpen);
  const currentDevice = useAppSelector((state) => state.backups.currentDevice);
  const { backupsAsFoldersPath, goToFolder, goToRootFolder } = props;
  const currentBackupsAsFoldersPath = backupsAsFoldersPath.at(-1);
  const previousBackupsAsFoldersPath = backupsAsFoldersPath.at(-2);
  const [isDeleting, setIsDeleting] = useState(false);

  const onClose = (): void => {
    dispatch(uiActions.setIsDeleteBackupDialog(false));
  };

  const deleteDeviceBackup = async (): Promise<void> => {
    const isBackupDevice = currentDevice && 'mac' in currentDevice;

    if (isBackupDevice) {
      dispatch(backupsThunks.deleteDeviceThunk(currentDevice));
    } else {
      await dispatch(deleteItemsThunk([currentDevice as DriveItemData])).unwrap();
      await backupsService.deleteBackupDeviceAsFolder((currentDevice as DriveWebFolderData).uuid);
      await dispatch(backupsThunks.fetchDevicesThunk());
    }
  };

  const deleteBackupFolder = async (): Promise<void> => {
    if (!currentBackupsAsFoldersPath) return;

    await backupsService.deleteBackupDeviceAsFolder(currentBackupsAsFoldersPath.uuid);
    await dispatch(backupsThunks.fetchDevicesThunk());
  };

  const onAccept = async (): Promise<void> => {
    const isDeviceLevel = backupsAsFoldersPath.length <= 1;

    try {
      setIsDeleting(true);
      if (isDeviceLevel) {
        await deleteDeviceBackup();
      } else {
        await deleteBackupFolder();
      }
    } catch (e: unknown) {
      errorService.reportError(e);
    } finally {
      setIsDeleting(false);
      onClose();
    }

    if (previousBackupsAsFoldersPath) {
      goToFolder(previousBackupsAsFoldersPath.id);
    } else if (isDeviceLevel) {
      goToRootFolder();
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      onSecondaryAction={onClose}
      onPrimaryAction={onAccept}
      title={translate('modals.deleteBackupModal.title')}
      subtitle={translate('modals.deleteBackupModal.subtitle')}
      primaryAction={translate('modals.deleteBackupModal.primaryAction')}
      secondaryAction={translate('modals.deleteBackupModal.secondaryAction')}
      primaryActionColor="danger"
      isLoading={isDeleting}
    />
  );
};

export default DeleteBackupDialog;
