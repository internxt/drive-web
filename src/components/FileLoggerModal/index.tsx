import React from 'react';

import { useState } from 'react';
import Item from './Item';
import './FileLogger.scss';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import iconService, { IconType } from '../../services/icon.service';
import { clearFileLoggerStatus, selectLoggerFiles } from '../../store/slices/files';
import { useEffect } from 'react';

const FileLoggerModal = (): JSX.Element => {
  const fileHistory = useAppSelector(selectLoggerFiles);
  const dispatch = useAppDispatch();
  const [isOpen, setIsOpen] = useState(false);
  const [hasFinished, setHasFinished] = useState(true);
  const [isMinimized, setIsMinized] = useState(false);

  const Button = ({ icon, onClick, style = '' }: { icon: IconType, onClick?: () => void, style?: string }) => {
    return (
      <div className={`flex items-center justify-center h-4 w-4 rounded-full bg-neutral-70 cursor-pointer ${style}`}
        onClick={onClick}
      >
        <img src={iconService.getIcon(icon)} alt="" />
      </div>
    );
  };

  const handleClose = () => {
    if (hasFinished) {
      setIsOpen(false);
      dispatch(clearFileLoggerStatus());
    }
  };

  useEffect(() => {
    if (Object.values(fileHistory).length) {
      setIsOpen(true);
      const processingItems = Object.values(fileHistory).findIndex(item => item.status !== 'success' && item.status !== 'error');

      if (processingItems !== -1) {
        setHasFinished(false);
      } else {
        setHasFinished(true);
      }
    }
  }, [fileHistory]);

  return (
    <div className={`fixed bottom-0 right-80 flex flex-col w-64 transform duration-300 ${isMinimized ? 'h-9' : 'h-64'} bg-white mr-8 mb-11 rounded-md border border-gray-30 overflow-hidden ${!isOpen ? 'hidden' : ''} z-20`}>
      <div className='flex justify-between bg-neutral-900 px-4 py-2.5 rounded-md select-none'>
        <div className='flex w-max'>
          <Button icon={IconType.doubleArrowUpWhite} style={`transform duration-500 ${!isMinimized ? 'rotate-180' : 'rotate-0'}`} />
          <span className='text-xs font-semibold text-white ml-2.5'>Activity</span>
        </div>

        <div className='flex'>
          <Button icon={IconType.doubleArrowUpWhite} onClick={() => setIsMinized(!isMinimized)} style={`mr-1.5 transform duration-500 ${!isMinimized ? 'rotate-180' : 'rotate-0'}`} />
          <Button icon={!hasFinished ? IconType.crossNeutralBlue : IconType.crossWhite} onClick={handleClose} />
        </div>
      </div>

      <div className='overflow-y-scroll scrollbar pt-2.5 h-full'>
        {Object.values(fileHistory).map(file => <Item item={file} key={file.filePath} />)}
      </div>
    </div>
  );
};

export default FileLoggerModal;
