import { useAppDispatch, useAppSelector } from 'app/store/hooks';
import BaseDialog from 'app/shared/components/BaseDialog/BaseDialog';
import BaseButton from 'app/shared/components/forms/BaseButton';
import { uiActions } from 'app/store/slices/ui';
import './SharedFolderTooBigDialog.scss';
import i18n from 'app/i18n/services/i18n.service';

const SharedFolderTooBigDialog = (): JSX.Element => {
  const isOpen = useAppSelector((state) => state.ui.isSharedFolderTooBigDialogOpen);
  const dispatch = useAppDispatch();

  const onClose = (): void => {
    dispatch(uiActions.setIsSharedFolderTooBigDialogOpen(false));
  };

  return (
    <BaseDialog title={i18n.get('error.titleSharedFolderTooBig')} isOpen={isOpen} onClose={onClose}>
      <span className="text-center block w-full text-base px-8 text-neutral-900 my-6">
        {i18n.get('error.sharedFolderTooBig')}&nbsp;
        {i18n.get('error.workingOnIt')} <a href={'https://help.internxt.com/en/'} target='_blank'>See more</a>
      </span>

      <div className="flex justify-center items-center w-full bg-l-neutral-20 py-6">
        <div className="flex w-64 px-8">
          <BaseButton onClick={() => onClose()} className="transparent w-11/12 mr-2">
            {i18n.get('actions.dismiss')}
          </BaseButton>
        </div>
      </div>
    </BaseDialog>
  );
};

export default SharedFolderTooBigDialog;
