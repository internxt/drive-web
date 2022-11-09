import { useSelector } from 'react-redux';
import BaseDialog from 'app/shared/components/BaseDialog/BaseDialog';
import { useState } from 'react';
import errorService from 'app/core/services/error.service';
import { uiActions } from 'app/store/slices/ui';
import { setItemsToDelete } from 'app/store/slices/storage';
import { useAppDispatch, useAppSelector } from 'app/store/hooks';
import { RootState } from 'app/store';
import { DriveItemData } from '../../types';
import i18n from 'app/i18n/services/i18n.service';
import deleteItems from '../../../../use_cases/trash/delete-items';
import Button from 'app/shared/components/Button/Button';

interface DeleteItemsDialogProps {
  onItemsDeleted?: () => void;
}

const DeleteItemsDialog = (props: DeleteItemsDialogProps): JSX.Element => {
  const itemsToDelete: DriveItemData[] = useSelector((state: RootState) => state.storage.itemsToDelete);
  const [isLoading, setIsLoading] = useState(false);
  const dispatch = useAppDispatch();
  const isOpen = useAppSelector((state: RootState) => state.ui.isDeleteItemsDialogOpen);

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
    } catch (err: unknown) {
      const castedError = errorService.castError(err);

      setIsLoading(false);

      console.log(castedError.message);
    }
  };

  return (
    <BaseDialog
      isOpen={isOpen}
      title="Delete permanently?"
      panelClasses="w-96 rounded-2xl pt-20px"
      titleClasses="text-left px-5 text-2xl font-medium"
      onClose={onClose}
      closeClass={'hidden'}
    >
      <span className="mt-20px block w-full px-5 text-left text-base text-neutral-900">
        {i18n.get('drive.deleteItems.advice')}
      </span>

      <div className="my-20px flex justify-end bg-white">
        <Button disabled={isLoading} variant="secondary" onClick={onClose} className="mr-3">
          {i18n.get('actions.cancel')}
        </Button>
        <Button disabled={isLoading} variant="accent" className="mr-5" onClick={onAccept} dataTest="delete-button">
          {isLoading ? 'Deleting...' : 'Delete'}
        </Button>
      </div>
    </BaseDialog>
  );
};

export default DeleteItemsDialog;
