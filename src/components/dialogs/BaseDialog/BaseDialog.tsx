import { useState } from 'react';

import { getIcon, IconType } from '../../../services/icon.service';

import './BaseDialog.scss';

interface BaseDialogProps {
  title: string;
  open: boolean;
  onClose: () => void;
  children: JSX.Element[];
}

const BaseDialog = ({
  open,
  title,
  onClose,
  children
}: BaseDialogProps
) => {
  return (
    <div className={`${open ? 'flex' : 'hidden'} absolute flex align-middle justify-center w-full h-full`}>
      {/* BACKGROUND */}
      <div className={`${open ? 'block' : 'hidden'} z-40 absolute opacity-80 bg-m-neutral-100 w-full h-full`}></div>

      {/* PANEL */}
      <div className={`dialog-panel ${open ? 'block' : 'hidden'} relative z-50 rounded-lg px-7 py-4 bg-white text-xs`}>
        <div className='flex items-center justify-center w-full'>
          <span className='text-neutral-90 font-semibold text-xs'>{title}</span>

          <img
            src={getIcon(IconType.CrossBlue)}
            alt=""
            className='dialog-close-button absolute mr-5 right-0 cursor-pointer'
            onClick={onClose}
          />
        </div>
        {children}
      </div>
    </div>
  );
};

export default BaseDialog;
