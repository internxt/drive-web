import BaseDialog from 'app/shared/components/BaseDialog/BaseDialog';

import authService from 'app/auth/services/auth.service';
import errorService from 'app/core/services/error.service';
import BaseButton from 'app/shared/components/forms/BaseButton';

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
      <span className="my-6 block w-full px-8 text-center text-base text-gray-100">
        All your files will be gone forever and you will lose access to your Internxt Drive account. Any active
        subscriptions you might have will also be cancelled. Once you click delete account, you will receive a
        confirmation email.
      </span>

      <div className="flex w-full items-center justify-center bg-gray-5 py-6">
        <div className="flex w-64 px-8">
          <BaseButton onClick={() => onClose()} className="transparent mr-2 w-11/12">
            Cancel
          </BaseButton>
          <BaseButton className="primary ml-2 w-11/12" onClick={() => onAccept()}>
            Confirm
          </BaseButton>
        </div>
      </div>
    </BaseDialog>
  );
};

export default DeleteAccountDialog;
