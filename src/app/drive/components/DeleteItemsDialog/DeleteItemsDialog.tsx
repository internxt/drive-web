import { useSelector } from 'react-redux';
import BaseDialog from 'app/shared/components/BaseDialog/BaseDialog';
import BaseButton from 'app/shared/components/forms/BaseButton';
import { useState } from 'react';
import errorService from 'app/core/services/error.service';
import { uiActions } from 'app/store/slices/ui';
import { setItemsToDelete } from 'app/store/slices/storage';
import { useAppDispatch, useAppSelector } from 'app/store/hooks';
import { RootState } from 'app/store';
import { DriveItemData } from '../../types';
import i18n from 'app/i18n/services/i18n.service';

import './DeleteItemsDialog.scss';
import deleteItems from '../../../../use_cases/trash/delete-items';

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
        deleteItems(itemsToDelete);
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
    <BaseDialog isOpen={isOpen} title="Delete permanently?" panelClasses='w-96 rounded-2xl pt-5' titleClasses='text-left px-5 text-2xl font-medium' onClose={onClose}>
      <span className="text-left block w-full text-base px-5 text-neutral-900 mt-5">
        {i18n.get('drive.deleteItems.advice')}
      </span>

      <div className="flex justify-right items-right bg-white mb-5 mt-5">
        <div className="flex w-64 ml-auto justify-right items-right">
          <BaseButton onClick={onClose} className="quaternary text-base font-medium h-10 rounded-lg w-24 px-1 ml-auto">
            {i18n.get('actions.cancel')}
          </BaseButton>
          <BaseButton className="primary w-24 mr-5 ml-2 delete-red" disabled={isLoading} onClick={onAccept}>
            {isLoading ? 'Deleting...' : 'Delete'}
          </BaseButton>
        </div>
      </div>
    </BaseDialog>
  );
};

export default DeleteItemsDialog;
