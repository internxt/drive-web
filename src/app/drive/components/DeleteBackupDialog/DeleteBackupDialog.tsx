import errorService from 'app/core/services/error.service';
import { uiActions } from 'app/store/slices/ui';
import { useAppDispatch, useAppSelector } from 'app/store/hooks';
import { RootState } from 'app/store';
import { DriveFolderData as DriveWebFolderData, DriveItemData } from '../../types';
import { deleteItemsThunk } from '../../../store/slices/storage/storage.thunks/deleteItemsThunk';
import { deleteBackupDeviceAsFolder } from '../../../drive/services/folder.service';
import { backupsThunks } from 'app/store/slices/backups';
import { SdkFactory } from '../../../core/factory/sdk';
import { BreadcrumbItemData } from 'app/shared/components/Breadcrumbs/Breadcrumbs';
import Dialog from '../../../shared/components/Dialog/Dialog';
interface DeleteBackupDialogProps {
  items: BreadcrumbItemData[];
  goToFolder: (folderId: number) => void;
}

const DeleteBackupDialog = (props: DeleteBackupDialogProps): JSX.Element => {
  const dispatch = useAppDispatch();
  const isOpen = useAppSelector((state: RootState) => state.ui.isDeleteBackupDialogOpen);
  const currentDevice = useAppSelector((state) => state.backups.currentDevice);
  const breadcrumbsItems = props.items;
  const currentBreadcrumb = props.items[props.items.length - 1];
  const previousBreadcrumb = props.items[props.items.length - 2];

  const onClose = (): void => {
    dispatch(uiActions.setIsDeleteBackupDialog(false));
  };

  const onAccept = async (): Promise<void> => {
    if (breadcrumbsItems.length === 2) {
      try {
        if (currentDevice && 'mac' in currentDevice) dispatch(backupsThunks.deleteDeviceThunk(currentDevice));
        else {
          await dispatch(deleteItemsThunk([currentDevice as DriveItemData])).unwrap();
          await deleteBackupDeviceAsFolder(currentDevice as DriveWebFolderData);
          await dispatch(backupsThunks.fetchDevicesThunk());
        }
        onClose();
        props.goToFolder(previousBreadcrumb.id);
      } catch (err: unknown) {
        const castedError = errorService.castError(err);

        console.log(castedError.message);
      }
    } else {
      try {
        const storageClient = SdkFactory.getInstance().createStorageClient();
        await storageClient.deleteFolder(currentBreadcrumb.id);
        await dispatch(backupsThunks.fetchDevicesThunk());
        onClose();
        props.goToFolder(previousBreadcrumb.id);
      } catch (err: unknown) {
        const castedError = errorService.castError(err);
        console.log(castedError.message);
      }
    }
  };

  return (
    <>
      <Dialog
        isOpen={isOpen}
        onClose={onClose}
        onSecondaryAction={onClose}
        onPrimaryAction={onAccept}
        secondaryAction="Cancel"
        primaryAction="Confirm"
        title="Are you sure?"
        subtitle="Your backup will be deleted."
        primaryActionColor="danger"
      />
    </>
  );
};

export default DeleteBackupDialog;
