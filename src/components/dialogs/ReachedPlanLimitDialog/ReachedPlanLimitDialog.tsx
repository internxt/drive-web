import { useAppDispatch } from '../../../store/hooks';
import { showReachedPlanLimit } from '../../../store/slices/ui';
import BaseDialog from '../BaseDialog/BaseDialog';
import history from '../../../lib/history';

import './ReachedPlanLimitDialog.scss';

interface ReachedPlanLimitDialogProps {
  open: boolean;
}

const ReachedPlanLimitDialog = ({ open }: ReachedPlanLimitDialogProps): JSX.Element => {
  const dispatch = useAppDispatch();
  const onCancel = (): void => {
    dispatch(showReachedPlanLimit(false));
  };
  const onAccept = async (): Promise<void> => {
    try {
      history.push('/account');
      dispatch(showReachedPlanLimit(false));
    } catch (e) {
      console.log(e);
    }
  };

  return (
    <BaseDialog
      title="Run out of space"
      open={open}
      onClose={onCancel}
    >
      <span className='text-center block w-full text-sm'>
      Your Internxt Drive is full. Get more space upgrading your account.
      </span>

      <div className='mt-3 flex justify-center'>
        <button onClick={onCancel} className='secondary'>
          Dismiss
        </button>
        <button onClick={onAccept} className='primary ml-2'>
          Upgrade
        </button>
      </div>
    </BaseDialog>
  );
};

export default ReachedPlanLimitDialog;
