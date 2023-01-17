import BaseDialog from 'app/shared/components/BaseDialog/BaseDialog';
import { useState } from 'react';
import errorService from 'app/core/services/error.service';
import { uiActions } from 'app/store/slices/ui';
import { useAppDispatch, useAppSelector } from 'app/store/hooks';
import { RootState } from 'app/store';
import i18n from 'app/i18n/services/i18n.service';
import clearTrash from '../../../../use_cases/trash/clear-trash';
import Button from 'app/shared/components/Button/Button';

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
    <BaseDialog
      isOpen={isOpen}
      title={i18n.get('drive.clearTrash.title')}
      panelClasses="w-96 rounded-2xl pt-5"
      titleClasses="text-left px-5 text-2xl font-medium"
      onClose={onClose}
      closeClass={'hidden'}
    >
      <span className="mt-5 block w-full px-5 text-left text-base text-neutral-900">
        {i18n.get('drive.clearTrash.advice')}
      </span>

      <div className="my-5 mr-5 flex justify-end space-x-2 bg-white">
        <Button disabled={isLoading} variant="secondary" onClick={onClose}>
          {i18n.get('actions.cancel')}
        </Button>
        <Button disabled={isLoading} variant="accent" onClick={onAccept}>
          {isLoading ? i18n.get('drive.clearTrash.progress') : i18n.get('drive.clearTrash.accept')}
        </Button>
      </div>
    </BaseDialog>
  );
};

export default ClearTrashDialog;
