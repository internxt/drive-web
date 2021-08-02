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

      {/* PANEL */}
      <div className={`base-dialog-panel ${isOpen ? 'block' : 'hidden'} relative z-50 rounded-lg pt-8 bg-white text-xs overflow-hidden`}>
        <div className='flex items-center justify-center w-full mb-4 px-4'>
          <div className="w-1/6"></div>
          <span className='whitespace-nowrap overflow-ellipsis overflow-hidden text-center w-4/6 flex-grow text-neutral-900 text-xl'>{title}</span>
          <div className="w-1/6 cursor-pointer" onClick={onClose}>
            <Unicons.UilTimes className="ml-auto text-blue-40" />
          </div>
        </div>
        {children}
      </div>
    </div>
  );
};

export default BaseDialog;
