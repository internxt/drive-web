import errorService from 'app/core/services/error.service';
import { uiActions } from 'app/store/slices/ui';
import { useAppDispatch, useAppSelector } from 'app/store/hooks';
import { RootState } from 'app/store';
import { DriveFolderData as DriveWebFolderData, DriveItemData } from '../../types';
import { deleteItemsThunk } from '../../../store/slices/storage/storage.thunks/deleteItemsThunk';
import { deleteBackupDeviceAsFolder } from '../../../drive/services/folder.service';
import { backupsThunks } from 'app/store/slices/backups';
import { SdkFactory } from '../../../core/factory/sdk';
import { DriveFolderData } from '@internxt/sdk/dist/drive/storage/types';
import Dialog from '../../../shared/components/Dialog/Dialog';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';

interface DeleteBackupDialogProps {
  backupsAsFoldersPath: DriveFolderData[];
  goToFolder: (folderId: number) => void;
}

const DeleteBackupDialog = (props: DeleteBackupDialogProps): JSX.Element => {
  const { translate } = useTranslationContext();
  const dispatch = useAppDispatch();
  const isOpen = useAppSelector((state: RootState) => state.ui.isDeleteBackupDialogOpen);
  const currentDevice = useAppSelector((state) => state.backups.currentDevice);
  const backupsAsFoldersPath = props.backupsAsFoldersPath;
  const currentBackupsAsFoldersPath = props.backupsAsFoldersPath[props.backupsAsFoldersPath.length - 1];
  const previousBackupsAsFoldersPath = props.backupsAsFoldersPath[props.backupsAsFoldersPath.length - 2];

  const onClose = (): void => {
    dispatch(uiActions.setIsDeleteBackupDialog(false));
  };

  const onAccept = async (): Promise<void> => {
    if (backupsAsFoldersPath.length === 2) {
      try {
        if (currentDevice && 'mac' in currentDevice) dispatch(backupsThunks.deleteDeviceThunk(currentDevice));
        else {
          await dispatch(deleteItemsThunk([currentDevice as DriveItemData])).unwrap();
          await deleteBackupDeviceAsFolder(currentDevice as DriveWebFolderData);
          await dispatch(backupsThunks.fetchDevicesThunk());
        }
        onClose();
        props.goToFolder(previousBackupsAsFoldersPath.id);
      } catch (e: unknown) {
        errorService.reportError(e);
      }
    } else {
      try {
        const storageClient = SdkFactory.getInstance().createStorageClient();
        await storageClient.deleteFolder(currentBackupsAsFoldersPath.id);
        await dispatch(backupsThunks.fetchDevicesThunk());
        onClose();
        props.goToFolder(previousBackupsAsFoldersPath.id);
      } catch (e: unknown) {
        errorService.reportError(e);
      }
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
    />
  );
};

export default DeleteBackupDialog;
