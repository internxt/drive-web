import BaseDialog from '../BaseDialog/BaseDialog';

import authService from '../../../services/auth.service';

const DeleteAccountDialog = (props: { isOpen: boolean, onClose: () => void; }): JSX.Element => {
  const onClose = (): void => {
    props.onClose && props.onClose();
  };
  const onAccept = async (): Promise<void> => {
    try {
      await authService.cancelAccount();
    } catch (e) {
      console.log(e);
    }
  };

  return (
    <BaseDialog
      title="Are you sure?"
      isOpen={props.isOpen}
      onClose={onClose}
    >
      <span className='text-center block w-full text-base px-8 text-neutral-900 my-6'>
      All your files will be gone forever and you will lose access to your Internxt Drive account. Any active subscriptions you might have will also be cancelled. Once you click delete account, you will receive a confirmation email.
      </span>

      <div className='flex justify-center items-center w-full bg-l-neutral-20 py-6'>
        <div className='flex w-64 px-8'>
          <button onClick={() => onClose()} className='transparent w-11/12 mr-2'>
            Cancel
          </button>
          <button className='primary w-11/12 ml-2' onClick={() => onAccept()} >
            Confirm
          </button>
        </div>
      </div>
    </BaseDialog>
  );
};

export default DeleteAccountDialog;
