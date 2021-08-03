import { useSelector } from 'react-redux';
import { DriveItemData } from '../../../models/interfaces';
import { RootState } from '../../../store';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { storageThunks } from '../../../store/slices/storage';
import { selectShowDeleteModal, setShowDeleteModal } from '../../../store/slices/ui';
import { setItemsToDelete } from '../../../store/slices/storage';
import BaseDialog from '../BaseDialog/BaseDialog';

import './DeleteItemsDialog.scss';
import { useState } from 'react';

interface DeleteItemsDialogProps {
}

const DeleteItemsDialog = ({ }: DeleteItemsDialogProps): JSX.Element => {
  const itemsToDelete: DriveItemData[] = useSelector((state: RootState) => state.storage.itemsToDelete);
  const [isLoading, setIsLoading] = useState(false);
  const dispatch = useAppDispatch();
  const isOpen = useAppSelector(selectShowDeleteModal);

  const onClose = (): void => {
    dispatch(setShowDeleteModal(false));
    dispatch(setItemsToDelete([]));
  };

  const onAccept = async (): Promise<void> => {
    try {
      setIsLoading(true);
      if (itemsToDelete.length > 0) {
        await dispatch(storageThunks.deleteItemsThunk(itemsToDelete));
      }
      onClose();
    } catch (e) {
      console.log(e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <BaseDialog
      isOpen={isOpen}
      title='Delete items'
      onClose={onClose}
    >
      <span className='text-center block w-full text-base px-8 text-neutral-900 mt-2'>
        Please confirm that you want to delete these items. This action can't be undone.
      </span>

      <div className='flex justify-center items-center bg-l-neutral-20 py-6 mt-6'>
        <div className='flex w-64'>
          <button onClick={() => onClose()} className='secondary_dialog w-full mr-2'>
            Cancel
          </button>
          <button className='primary w-11/12 ml-2' disabled={isLoading} onClick={() => onAccept()} >
            {isLoading ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </BaseDialog>
  );
};

export default DeleteItemsDialog;
