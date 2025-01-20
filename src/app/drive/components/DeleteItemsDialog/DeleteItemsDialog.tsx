import { useSelector } from 'react-redux';
import { useState } from 'react';
import errorService from 'app/core/services/error.service';
import { uiActions } from 'app/store/slices/ui';
import { setItemsToDelete } from 'app/store/slices/storage';
import { useAppDispatch, useAppSelector } from 'app/store/hooks';
import { RootState } from 'app/store';
import { DriveItemData } from '../../types';
import deleteItems from '../../../../use_cases/trash/delete-items';
import { Button } from '@internxt/ui';
import Modal from 'app/shared/components/Modal';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import { planThunks } from 'app/store/slices/plan';

interface DeleteItemsDialogProps {
  onItemsDeleted?: () => void;
}

const DeleteItemsDialog = (props: DeleteItemsDialogProps): JSX.Element => {
  const { translate } = useTranslationContext();
  const itemsToDelete: DriveItemData[] = useSelector((state: RootState) => state.storage.itemsToDelete);
  const [isLoading, setIsLoading] = useState(false);
  const dispatch = useAppDispatch();
  const isOpen = useAppSelector((state: RootState) => state.ui.isDeleteItemsDialogOpen);
  const { selectedWorkspace } = useAppSelector((state: RootState) => state.workspaces);
  const memberId = selectedWorkspace?.workspaceUser?.memberId;

  const onClose = (): void => {
    dispatch(uiActions.setIsDeleteItemsDialogOpen(false));
    dispatch(setItemsToDelete([]));
  };

  const onAccept = async (): Promise<void> => {
    try {
      setIsLoading(true);
      if (itemsToDelete.length > 0) {
        await deleteItems(itemsToDelete);
      }

      props.onItemsDeleted && props.onItemsDeleted();

      setIsLoading(false);
      onClose();
      setTimeout(() => {
        dispatch(planThunks.fetchUsageThunk());
        if (memberId) dispatch(planThunks.fetchBusinessLimitUsageThunk());
      }, 1000);
    } catch (err: unknown) {
      const castedError = errorService.castError(err);

      setIsLoading(false);

      console.log(castedError.message);
    }
  };

  return (
    <Modal maxWidth="max-w-md" isOpen={isOpen} onClose={onClose}>
      <div className="flex flex-col space-y-5">
        <p className="text-2xl font-medium text-gray-100">{translate('drive.deleteItems.title')}</p>
        <p className="text-lg text-gray-80">{translate('drive.deleteItems.advice')}</p>

        <div className="flex flex-row items-center justify-end space-x-2">
          <Button disabled={isLoading} variant="secondary" onClick={onClose}>
            {translate('actions.cancel')}
          </Button>
          <Button disabled={isLoading} variant="destructive" onClick={onAccept} dataTest="delete-button">
            {isLoading ? translate('drive.deleteItems.progress') : translate('drive.deleteItems.accept')}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default DeleteItemsDialog;
