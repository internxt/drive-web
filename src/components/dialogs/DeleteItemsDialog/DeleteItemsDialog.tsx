import { useSelector } from 'react-redux';
import { DriveItemData } from '../../../models/interfaces';
import { RootState } from '../../../store';
import { useAppDispatch } from '../../../store/hooks';
import { storageThunks } from '../../../store/slices/storage';
import { setIsDeleteItemsDialogOpen } from '../../../store/slices/ui';
import { setItemsToDelete } from '../../../store/slices/storage';
import BaseDialog from '../BaseDialog/BaseDialog';

import './DeleteItemsDialog.scss';

interface DeleteItemsDialogProps {
  open: boolean;
}

const DeleteItemsDialog = ({ open }: DeleteItemsDialogProps): JSX.Element => {
  const itemsToDelete: DriveItemData[] = useSelector((state: RootState) => state.storage.itemsToDelete);
  const dispatch = useAppDispatch();
  const onCancel = (): void => {
    dispatch(setIsDeleteItemsDialogOpen(false));
    dispatch(setItemsToDelete([]));
  };
  const onAccept = async (): Promise<void> => {
    try {
      if (itemsToDelete.length > 0) {
        await dispatch(storageThunks.deleteItemsThunk(itemsToDelete));
      }
      onCancel();
    } catch (e) {
      console.log(e);
    }
  };

  return (
    <BaseDialog
      title="Delete items"
      open={open}
      onClose={onCancel}
    >
      <span className='text-center block w-full text-sm'>
        Pleas confirm you want to delete these items. This action can't be undone.
      </span>

      <div className='mt-3 flex justify-center'>
        <button onClick={onCancel} className='secondary_dialog w-full mr-4'>
          Cancel
        </button>
        <button onClick={onAccept} className='primary w-11/12'>
          Confirm
        </button>
      </div>
    </BaseDialog>
  );
};

export default DeleteItemsDialog;
