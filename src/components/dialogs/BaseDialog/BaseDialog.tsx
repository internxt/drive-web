import React from 'react';
import * as Unicons from '@iconscout/react-unicons';

interface BaseDialogProps {
  isOpen: boolean,
  title: string,
  children: JSX.Element | JSX.Element[],
  onClose: () => void
}

const BaseDialog = ({ isOpen, title, children, onClose }: BaseDialogProps): JSX.Element => {
  return (
    <div className={`${isOpen ? 'flex' : 'hidden'} flex-col absolute top-1/2 left-1/2 transform -translate-y-1/2 -translate-x-1/2 w-104 pt-8 rounded-lg overflow-hidden z-10 bg-white`}>
      <Unicons.UilTimes className='absolute right-8 cursor-pointer transition duration-200 ease-in-out text-blue-60 hover:text-blue-70' onClick={onClose} />

      <span className='text-neutral-900 text-xl text-center'>{title}</span>

      {/* PANEL */}
      <div className={`base-dialog-panel ${isOpen ? 'block' : 'hidden'} relative z-50 rounded-lg pt-8 bg-white text-xs overflow-hidden`}>
        <div className='flex items-center justify-center w-full mb-4 px-4'>
          <div className="w-1/6"></div>
          <span className='text-center w-4/6 flex-grow text-neutral-900 text-xl'>{title}</span>
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
