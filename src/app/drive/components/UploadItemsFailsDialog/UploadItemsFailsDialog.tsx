import BaseDialog from 'app/shared/components/BaseDialog/BaseDialog';
import { uiActions } from 'app/store/slices/ui';
import { useAppDispatch, useAppSelector } from 'app/store/hooks';
import { RootState } from 'app/store';
import { get } from 'app/i18n/services/i18n.service';
import Button from 'app/shared/components/Button/Button';

const UploadItemsDialog = (): JSX.Element => {
  const dispatch = useAppDispatch();
  const isOpen = useAppSelector((state: RootState) => state.ui.isUploadItemsFailsDialogOpen);

  const onClose = (): void => {
    dispatch(uiActions.setIsUploadItemsFailsDialogOpen(false));
  };

  return (
    <BaseDialog
      isOpen={isOpen}
      title={get('drive.uploadItems.title')}
      panelClasses="w-96 rounded-2xl pt-20px"
      titleClasses="text-left px-5 text-2xl font-medium"
      onClose={onClose}
      closeClass={'hidden'}
    >
      <span className="mt-20px block w-full px-5 text-left text-base text-neutral-900">
        {get('drive.uploadItems.advice')}
      </span>

      <div className="my-20px flex justify-end bg-white">
        <Button variant="secondary" onClick={onClose} className="mr-3">
          {get('drive.uploadItems.close')}
        </Button>
      </div>
    </BaseDialog>
  );
};

export default UploadItemsDialog;
