import { useSelector } from 'react-redux';
import { DriveItemData } from '../../../models/interfaces';
import { RootState } from '../../../store';
import { useAppDispatch } from '../../../store/hooks';
import { storageThunks } from '../../../store/slices/storage';
import { setIsDeleteItemsDialogOpen } from '../../../store/slices/ui';
import { setItemsToDelete } from '../../../store/slices/storage';
import BaseDialog from '../BaseDialog/BaseDialog';

import './DeleteItemsDialog.scss';
import { useState } from 'react';

interface DeleteItemsDialogProps {
  open: boolean;
}

const DeleteItemsDialog = ({ open }: DeleteItemsDialogProps): JSX.Element => {
  const itemsToDelete: DriveItemData[] = useSelector((state: RootState) => state.storage.itemsToDelete);
  const [isLoading, setIsLoading] = useState(false);
  const dispatch = useAppDispatch();

  const onCancel = (): void => {
    dispatch(setIsDeleteItemsDialogOpen(false));
    dispatch(setItemsToDelete([]));
  };

  const onAccept = async (): Promise<void> => {
    try {
      setIsLoading(true);
      if (itemsToDelete.length > 0) {
        await dispatch(storageThunks.deleteItemsThunk(itemsToDelete));
      }
      onCancel();
    } catch (e) {
      console.log(e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <BaseDialog
      title="Delete items"
      open={open}
      onClose={onCancel}
    >
      <span className='text-center block w-full text-base px-8 text-neutral-900'>
        Please confirm that you want to delete these items. This action can't be undone.
      </span>

      <div className='mt-7 flex justify-center bg-l-neutral-20 pb-8 px-8 pt-4'>
        <button onClick={onCancel} className='secondary_dialog w-full mr-4'>
          Cancel
        </button>
        <button onClick={onAccept} disabled={isLoading} className='primary w-11/12'>
          {isLoading ? 'Deleting...' : 'Confirm'}
        </button>
      </div>
    </BaseDialog>
  );
};

export default DeleteItemsDialog;
