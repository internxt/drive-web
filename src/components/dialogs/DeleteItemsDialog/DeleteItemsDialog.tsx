import { useAppDispatch } from '../../../store/hooks';
import { storageThunks } from '../../../store/slices/storage';
import { setIsDeleteItemsDialogOpen } from '../../../store/slices/ui';
import BaseDialog from '../BaseDialog/BaseDialog';

import './DeleteItemsDialog.scss';

interface DeleteItemsDialogProps {
  open: boolean;
}

const DeleteItemsDialog = ({ open }: DeleteItemsDialogProps): JSX.Element => {
  const dispatch = useAppDispatch();
  const onCancel = (): void => {
    dispatch(setIsDeleteItemsDialogOpen(false));
  };
  const onAccept = async (): Promise<void> => {
    try {
      await dispatch(storageThunks.deleteItemsThunk()).unwrap();
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
        <button onClick={onCancel} className='secondary'>
          Cancel
        </button>
        <button onClick={onAccept} className='primary ml-2'>
          Confirm
        </button>
      </div>
    </BaseDialog>
  );
};

export default DeleteItemsDialog;
