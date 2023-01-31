import { useAppDispatch, useAppSelector } from 'app/store/hooks';
import BaseDialog from 'app/shared/components/BaseDialog/BaseDialog';
import BaseButton from 'app/shared/components/forms/BaseButton';
import { uiActions } from 'app/store/slices/ui';
import navigationService from 'app/core/services/navigation.service';
import { AppView } from 'app/core/types';
import { get } from 'app/i18n/services/i18n.service';

const ReachedPlanLimitDialog = (): JSX.Element => {
  const isOpen = useAppSelector((state) => state.ui.isReachedPlanLimitDialogOpen);
  const dispatch = useAppDispatch();

  const onClose = (): void => {
    dispatch(uiActions.setIsReachedPlanLimitDialogOpen(false));
  };

  const onAccept = async (): Promise<void> => {
    try {
      dispatch(uiActions.setIsReachedPlanLimitDialogOpen(false));
      navigationService.push(AppView.Preferences, { tab: 'plans' });
    } catch (e: unknown) {
      console.log(e);
    }
  };

  return (
    <BaseDialog title="Run out of space" isOpen={isOpen} onClose={onClose}>
      <span className="my-6 block w-full px-8 text-center text-base text-neutral-900">
        {get('error.noSpaceAvailable')}
      </span>

      <div className="flex w-full items-center justify-center bg-neutral-20 py-6">
        <div className="flex w-64 px-8">
          <BaseButton onClick={() => onClose()} className="transparent mr-2 w-11/12">
            {get('actions.cancel')}
          </BaseButton>
          <BaseButton className="primary ml-2 w-11/12" onClick={() => onAccept()}>
            {get('actions.upgrade')}
          </BaseButton>
        </div>
      </div>
    </BaseDialog>
  );
};

export default ReachedPlanLimitDialog;
