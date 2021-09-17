import BaseDialog from '../BaseDialog/BaseDialog';

import authService from '../../../services/auth.service';
import errorService from '../../../services/error.service';
import BaseButton from '../../Buttons/BaseButton';

const DeleteAccountDialog = (props: { isOpen: boolean; onClose: () => void }): JSX.Element => {
  const onClose = (): void => {
    props.onClose && props.onClose();
  };
  const onAccept = async (): Promise<void> => {
    try {
      await authService.cancelAccount();
      onClose();
    } catch (err: unknown) {
      const castedError = errorService.castError(err);
      console.log(castedError.message);
    }
  };

  return (
    <BaseDialog title="Are you sure?" isOpen={props.isOpen} onClose={onClose}>
      <span className="text-center block w-full text-base px-8 text-neutral-900 my-6">
        All your files will be gone forever and you will lose access to your Internxt Drive account. Any active
        subscriptions you might have will also be cancelled. Once you click delete account, you will receive a
        confirmation email.
      </span>

      <div className="flex justify-center items-center w-full bg-l-neutral-20 py-6">
        <div className="flex w-64 px-8">
          <BaseButton onClick={() => onClose()} className="transparent w-11/12 mr-2">
            Cancel
          </BaseButton>
          <BaseButton className="primary w-11/12 ml-2" onClick={() => onAccept()}>
            Confirm
          </BaseButton>
        </div>
      </div>
    </BaseDialog>
  );
};

export default DeleteAccountDialog;
