import { useSelector } from 'react-redux';
import { DriveItemData } from '../../../models/interfaces';
import { RootState } from '../../../store';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { setItemsToDelete } from '../../../store/slices/storage';
import BaseDialog from '../BaseDialog/BaseDialog';

import './DeleteItemsDialog.scss';
import { useState } from 'react';
import { uiActions } from '../../../store/slices/ui';
import BaseButton from '../../Buttons/BaseButton';
import storageThunks from '../../../store/slices/storage/storage.thunks';
import errorService from '../../../services/error.service';

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
        await dispatch(storageThunks.deleteItemsThunk(itemsToDelete));
      }

      props.onItemsDeleted && props.onItemsDeleted();

      onClose();
    } catch (err: unknown) {
      const castedError = errorService.castError(err);

      console.log(castedError.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <BaseDialog isOpen={isOpen} title="Delete items" onClose={onClose}>
      <span className="text-center block w-full text-base px-8 text-neutral-900 mt-2">
        Please confirm that you want to delete these items. This action can't be undone.
      </span>

      <div className="flex justify-center items-center bg-l-neutral-20 py-6 mt-6">
        <div className="flex w-64">
          <BaseButton onClick={() => onClose()} classes="cancel w-full mr-2">
            Cancel
          </BaseButton>
          <BaseButton classes="primary w-11/12 ml-2" disabled={isLoading} onClick={() => onAccept()}>
            {isLoading ? 'Deleting...' : 'Delete'}
          </BaseButton>
        </div>
      </div>
    </BaseDialog>
  );
};

export default DeleteItemsDialog;
