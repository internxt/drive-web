import navigationService from 'app/core/services/navigation.service';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import BaseDialog from 'app/shared/components/BaseDialog/BaseDialog';
import { Button } from '@internxt/ui';
import { useAppDispatch, useAppSelector } from 'app/store/hooks';
import { uiActions } from 'app/store/slices/ui';
import DriveStorageError from '../../../../assets/images/drive-error.svg';
import workspacesSelectors from '../../../store/slices/workspaces/workspaces.selectors';

const ReachedPlanLimitDialog = (): JSX.Element => {
  const { translate } = useTranslationContext();
  const isOpen = useAppSelector((state) => state.ui.isReachedPlanLimitDialogOpen);
  const selectedWorkspace = useAppSelector(workspacesSelectors.getSelectedWorkspace);

  const dispatch = useAppDispatch();

  const onClose = (): void => {
    dispatch(uiActions.setIsReachedPlanLimitDialogOpen(false));
  };

  const onAccept = async (): Promise<void> => {
    try {
      dispatch(uiActions.setIsReachedPlanLimitDialogOpen(false));
      navigationService.openPreferencesDialog({
        section: 'account',
        subsection: 'plans',
        workspaceUuid: selectedWorkspace?.workspaceUser.workspaceId,
      });
      dispatch(uiActions.setIsPreferencesDialogOpen(true));
    } catch (e: unknown) {
      console.log(e);
    }
  };

  return (
    <BaseDialog hideCloseButton isOpen={isOpen} onClose={onClose} bgColor="bg-surface">
      <div className="px-5 pb-5">
        <img className="mx-auto mb-5" src={DriveStorageError} />
        <div className="mb-2">
          <h2 className="text-center text-2xl font-medium leading-8 text-gray-100">
            {translate('error.storageIsFull')}
          </h2>
        </div>
        <p className="mb-5 text-center leading-tight text-gray-80">{translate('error.storageIsFullDescription')}</p>

        <div className="flex flex-row justify-end">
          <Button variant="secondary" className="mr-2" onClick={() => onClose()}>
            {translate('actions.cancel') as string}
          </Button>
          <Button variant="primary" onClick={() => onAccept()}>
            {translate('actions.buyStorage') as string}
          </Button>
        </div>
      </div>
    </BaseDialog>
  );
};

export default ReachedPlanLimitDialog;
