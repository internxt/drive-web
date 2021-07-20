import { useAppDispatch } from '../../../store/hooks';
import { deleteItemsThunk } from '../../../store/slices/storageSlice';
import { setIsDeleteItemsDialogOpen } from '../../../store/slices/uiSlice';
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
      await dispatch(deleteItemsThunk()).unwrap();
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
      <span className='text-center block w-full text-xs mt-4'>
        Pleas confirm you want to delete these items. This action can't be undone.
      </span>

      <div className='mt-3 flex justify-center'>
        <button onClick={onAccept} className='px-3 h-7 text-white font-light bg-blue-60 rounded-sm'>
          Confirm
        </button>
        <button onClick={onCancel} className='px-3 stext-blue-60 font-light ml-4'>
          Cancel
        </button>
      </div>
    </BaseDialog>
  );
};

export default DeleteItemsDialog;
