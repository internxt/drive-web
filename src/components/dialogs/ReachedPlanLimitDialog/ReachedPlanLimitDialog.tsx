import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import BaseDialog from '../BaseDialog/BaseDialog';
import history from '../../../lib/history';

import './ReachedPlanLimitDialog.scss';
import { uiActions } from '../../../store/slices/ui';

const ReachedPlanLimitDialog = (): JSX.Element => {
  const isOpen = useAppSelector((state) => state.ui.isReachedPlanLimitDialogOpen);
  const dispatch = useAppDispatch();

  const onClose = (): void => {
    dispatch(uiActions.setIsReachedPlanLimitDialogOpen(false));
  };

  const onAccept = async (): Promise<void> => {
    try {
      history.push('/account');
      dispatch(uiActions.setIsReachedPlanLimitDialogOpen(false));
    } catch (e) {
      console.log(e);
    }
  };

  return (
    <BaseDialog
      title="Run out of space"
      isOpen={isOpen}
      onClose={onClose}
    >
      <span className='text-center block w-full text-base px-8 text-neutral-900 my-6'>
        Your Internxt Drive is full. Get more space upgrading your account.
      </span>

      <div className='flex justify-center items-center w-full bg-l-neutral-20 py-6'>
        <div className='flex w-64 px-8'>
          <button onClick={() => onClose()} className='transparent w-11/12 mr-2'>
            Cancel
          </button>
          <button className='primary w-11/12 ml-2' onClick={() => onAccept()} >
            Upgrade
          </button>
        </div>
      </div>
    </BaseDialog>
  );
};

export default ReachedPlanLimitDialog;
