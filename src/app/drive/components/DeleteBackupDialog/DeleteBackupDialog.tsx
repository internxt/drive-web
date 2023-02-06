import { useState } from 'react';
import errorService from 'app/core/services/error.service';
import { uiActions } from 'app/store/slices/ui';
import { useAppDispatch, useAppSelector } from 'app/store/hooks';
import { RootState } from 'app/store';
import { DriveFolderData as DriveWebFolderData, DriveItemData } from '../../types';
import i18n from 'app/i18n/services/i18n.service';
import Button from 'app/shared/components/Button/Button';
import Modal from 'app/shared/components/Modal';
import { deleteItemsThunk } from '../../../store/slices/storage/storage.thunks/deleteItemsThunk';
import { deleteBackupDeviceAsFolder } from '../../../drive/services/folder.service';
import { backupsThunks } from 'app/store/slices/backups';
import { SdkFactory } from '../../../core/factory/sdk';

export interface BreadcrumbItemData {
  id: number;
  label: string;
  icon: JSX.Element | null;
  active: boolean;
  isFirstPath?: boolean;
  dialog?: boolean;
  isBackup?: boolean;
  onClick?: () => void;
}

interface BreadcrumbsProps {
  items: BreadcrumbItemData[];
  goToFolder: (folderId: number) => void;
}

const DeleteBackupDialog = (props: BreadcrumbsProps): JSX.Element => {
  const [isLoading, setIsLoading] = useState(false);
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
        setIsLoading(true);
        if (currentDevice && 'mac' in currentDevice) dispatch(backupsThunks.deleteDeviceThunk(currentDevice));
        else {
          await dispatch(deleteItemsThunk([currentDevice as DriveItemData])).unwrap();
          await deleteBackupDeviceAsFolder(currentDevice as DriveWebFolderData);
          dispatch(backupsThunks.fetchDevicesThunk());
        }

        setIsLoading(false);
        onClose();
        props.goToFolder(previousBreadcrumb.id);
      } catch (err: unknown) {
        const castedError = errorService.castError(err);

        setIsLoading(false);

        console.log(castedError.message);
      }
    } else {
      try {
        setIsLoading(true);

        const storageClient = SdkFactory.getInstance().createStorageClient();
        await storageClient.deleteFolder(currentBreadcrumb.id);
        dispatch(backupsThunks.fetchDevicesThunk());

        setIsLoading(false);
        onClose();
        props.goToFolder(previousBreadcrumb.id);
      } catch (err: unknown) {
        const castedError = errorService.castError(err);

        setIsLoading(false);

        console.log(castedError.message);
      }
    }
  };

  return (
    <Modal maxWidth="max-w-md" isOpen={isOpen} onClose={onClose}>
      <div className="flex flex-col space-y-5">
        <p className="text-2xl font-medium text-gray-100">Delete permanently?</p>
        <p className="text-lg text-gray-80">{i18n.get('drive.deleteItems.advice')}</p>

        <div className="flex flex-row items-center justify-end space-x-2">
          <Button disabled={isLoading} variant="secondary" onClick={onClose}>
            {i18n.get('actions.cancel')}
          </Button>
          <Button disabled={isLoading} variant="accent" onClick={onAccept} dataTest="delete-button">
            {isLoading ? i18n.get('drive.deleteItems.progress') : i18n.get('drive.deleteItems.accept')}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default DeleteBackupDialog;
