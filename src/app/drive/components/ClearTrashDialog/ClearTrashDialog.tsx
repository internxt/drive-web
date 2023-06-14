import { useState } from 'react';
import errorService from 'app/core/services/error.service';
import { uiActions } from 'app/store/slices/ui';
import { useAppDispatch, useAppSelector } from 'app/store/hooks';
import { RootState } from 'app/store';
import clearTrash from '../../../../use_cases/trash/clear-trash';
import Button from 'app/shared/components/Button/Button';
import Modal from 'app/shared/components/Modal';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import { planThunks } from 'app/store/slices/plan';

interface ClearTrashDialogProps {
  onItemsDeleted?: () => void;
}

const ClearTrashDialog = (props: ClearTrashDialogProps): JSX.Element => {
  const { translate } = useTranslationContext();
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
      setTimeout(() => {
        dispatch(planThunks.fetchUsageThunk());
      }, 1000);
    } catch (err: unknown) {
      const castedError = errorService.castError(err);

      setIsLoading(false);

      console.log(castedError.message);
    }
  };

  return (
    <Modal maxWidth="max-w-md" isOpen={isOpen} onClose={onClose}>
      <div className="flex flex-col space-y-5">
        <p className="text-2xl font-medium text-gray-100">{translate('drive.clearTrash.title')}</p>
        <p className="text-lg text-gray-80">{translate('drive.clearTrash.advice')}</p>

        <div className="flex flex-row items-center justify-end space-x-2">
          <Button disabled={isLoading} variant="secondary" onClick={onClose}>
            {translate('actions.cancel')}
          </Button>
          <Button disabled={isLoading} variant="accent" onClick={onAccept}>
            {isLoading ? translate('drive.clearTrash.progress') : translate('drive.clearTrash.accept')}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default ClearTrashDialog;
