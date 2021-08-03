import * as Unicons from '@iconscout/react-unicons';

import './BaseDialog.scss';

interface BaseDialogProps {
  isOpen: boolean,
  title: string,
  children: JSX.Element | JSX.Element[],
  onClose: () => void
}

const BaseDialog = ({ isOpen, title, children, onClose }: BaseDialogProps): JSX.Element => {
  return (
    <div className={`${isOpen ? 'flex' : 'hidden'} fixed z-50 flex align-middle justify-center w-full h-full`}>
      {/* BACKGROUND */}
      <div className={`${isOpen ? 'block' : 'hidden'} z-40 absolute opacity-80 bg-m-neutral-100 w-full h-full`}></div>

      <span className='text-neutral-900 text-xl text-center'>{title}</span>

      {children}
    </div>
  );
};

export default BaseDialog;
