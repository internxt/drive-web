import { ReactNode } from 'react';
import { getIcon, IconType } from '../../../services/icon.service';

import './BaseDialog.scss';

interface BaseDialogProps {
  title: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}

const BaseDialog = ({
  open,
  title,
  onClose,
  children
}: BaseDialogProps
): JSX.Element => {
  return (
    <div className={`${open ? 'flex' : 'hidden'} absolute flex align-middle justify-center w-full h-full`}>
      {/* BACKGROUND */}
      <div className={`${open ? 'block' : 'hidden'} z-40 absolute opacity-80 bg-m-neutral-100 w-full h-full`}></div>

      {/* PANEL */}
      <div className={`base-dialog-panel ${open ? 'block' : 'hidden'} relative z-50 rounded-lg p-8 bg-white text-xs`}>
        <div className='flex items-center justify-center w-full mb-4'>
          <div className="w-1/6"></div>
          <span className='text-center w-4/6 flex-grow text-neutral-90 text-base'>{title}</span>
          <div className="w-1/6 cursor-pointer" onClick={onClose}>
            <img src={getIcon(IconType.CrossBlue)} alt="" className="ml-auto" />
          </div>
        </div>
        {children}
      </div>
    </div>
  );
};

export default BaseDialog;
