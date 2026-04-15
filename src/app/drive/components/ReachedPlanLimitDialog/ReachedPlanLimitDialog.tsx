import navigationService from 'services/navigation.service';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import { Button, BaseDialog } from '@internxt/ui';
import { useAppDispatch, useAppSelector } from 'app/store/hooks';
import { uiActions } from 'app/store/slices/ui';
import DriveStorageError from 'assets/images/drive-error.svg';
import workspacesSelectors from 'app/store/slices/workspaces/workspaces.selectors';

const ReachedPlanLimitDialog = (): JSX.Element => {
  const { translate } = useTranslationContext();
  const isOpen = useAppSelector((state) => state.ui.isReachedPlanLimitDialogOpen);
  const reachedPlanLimitInfo = useAppSelector((state) => state.ui.reachedPlanLimitDialogInfo);
  const selectedWorkspace = useAppSelector(workspacesSelectors.getSelectedWorkspace);

  const dispatch = useAppDispatch();

  const onClose = (): void => {
    dispatch(
      uiActions.setOpenReachedPlanLimitDialog({
        open: false,
      }),
    );
  };

  const onAccept = async (): Promise<void> => {
    try {
      dispatch(
        uiActions.setOpenReachedPlanLimitDialog({
          open: false,
        }),
      );
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
        <img className="mx-auto mb-5" src={DriveStorageError} alt="Drive storage error" />
        <div className="mb-2">
          <h2 className="text-center text-2xl font-medium leading-8 text-gray-100">
            {reachedPlanLimitInfo?.title ?? translate('error.storageIsFull')}
          </h2>
        </div>
        <p className="mb-5 text-center leading-tight text-gray-80">
          {reachedPlanLimitInfo?.description ?? translate('error.storageIsFullDescription')}
        </p>

        <div className="flex flex-row justify-end">
          <Button variant="secondary" className="mr-2" onClick={() => onClose()}>
            {translate('actions.cancel')}
          </Button>
          <Button variant="primary" onClick={() => onAccept()}>
            {translate('actions.buyStorage')}
          </Button>
        </div>
      </div>
    </BaseDialog>
  );
};

export default ReachedPlanLimitDialog;
