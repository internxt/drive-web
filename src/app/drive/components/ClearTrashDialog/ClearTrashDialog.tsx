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
    <BaseDialog isOpen={isOpen} title={i18n.get('drive.clearTrash.title')} onClose={onClose} closable={false}>
      <span className="text-left block w-full text-base px-8 text-neutral-900 mt-2">
        {i18n.get('drive.clearTrash.advice')}
      </span>

      <div className="flex justify-end items-center py-6 px-8 mt-6">
        <div className="flex w-64">
          <BaseButton onClick={() => onClose()} className="cancel w-full mr-2">
            {i18n.get('actions.cancel')}
          </BaseButton>
          <BaseButton className="primary w-11/12 ml-2" disabled={isLoading} onClick={() => onAccept()}>
            {isLoading ? i18n.get('drive.clearTrash.progress') : i18n.get('drive.clearTrash.accept')}
          </BaseButton>
        </div>
      </div>
    </BaseDialog>
  );
};

export default ClearTrashDialog;
