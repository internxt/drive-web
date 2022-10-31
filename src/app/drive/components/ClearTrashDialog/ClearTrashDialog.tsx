import BaseDialog from 'app/shared/components/BaseDialog/BaseDialog';
import { useState } from 'react';
import BaseButton from 'app/shared/components/forms/BaseButton';
import errorService from 'app/core/services/error.service';
import { uiActions } from 'app/store/slices/ui';
import { useAppDispatch, useAppSelector } from 'app/store/hooks';
import { RootState } from 'app/store';
import i18n from 'app/i18n/services/i18n.service';

import './ClearTrashDialog.scss';
import clearTrash from '../../../../use_cases/trash/clear-trash';

interface ClearTrashDialogProps {
  onItemsDeleted?: () => void;
}

const ClearTrashDialog = (props: ClearTrashDialogProps): JSX.Element => {
  const [isLoading, setIsLoading] = useState(false);
  const dispatch = useAppDispatch();
  const isOpen = useAppSelector((state: RootState) => state.ui.isClearTrashDialogOpen);

  const onClose = (): void => {
    dispatch(uiActions.setIsClearTrashDialogOpen(false));
  };

  const onAccept = async (): Promise<void> => {
    try {
      setIsLoading(true);
      clearTrash();

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
    <BaseDialog isOpen={isOpen} title={i18n.get('drive.clearTrash.title')} onClose={onClose} panelClasses='w-96 rounded-2xl pt-5' titleClasses='text-left px-5 text-2xl font-medium'>
      <span className="text-left block w-full text-base px-5 text-neutral-900 mt-5">
        {i18n.get('drive.clearTrash.advice')}
      </span>

      <div className="flex justify-right items-right bg-white mb-5 mt-5">
        <div className="flex w-64 ml-auto justify-right items-right">
          <BaseButton onClick={() => onClose()} className="quaternary text-base font-medium h-10 rounded-lg w-24 px-1 ml-auto">
            {i18n.get('actions.cancel')}
          </BaseButton>
          <BaseButton className="primary w-32 mr-5 ml-2 delete-red" disabled={isLoading} onClick={() => onAccept()}>
            {isLoading ? i18n.get('drive.clearTrash.progress') : i18n.get('drive.clearTrash.accept')}
          </BaseButton>
        </div>
      </div>
    </BaseDialog>
  );
};

export default ClearTrashDialog;
