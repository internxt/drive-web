import React from 'react';
import { UilTimes } from '@iconscout/react-unicons';

interface BaseDialog {
  isOpen: boolean,
  title: string,
  children: JSX.Element,
  onClose: () => void
}

const BaseDialog2 = ({ isOpen, title, children, onClose }: BaseDialog): JSX.Element => {
  return (
    <div className={`${isOpen ? 'flex' : 'hidden'} absolute top-1/2 left-1/2 transform -translate-y-1/2 -translate-x-1/2 w-104 flex flex-col pt-8 rounded-lg overflow-hidden z-10 bg-white`}>
      <UilTimes className='absolute right-8 cursor-pointer transition duration-200 ease-in-out text-blue-60 hover:text-blue-70' onClick={onClose} />

      <span className='text-neutral-900 text-xl text-center'>{title}</span>

      {children}
    </div>
  );
};

export default BaseDialog2;
