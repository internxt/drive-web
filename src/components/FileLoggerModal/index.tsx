import { useState } from 'react';
import * as Unicons from '@iconscout/react-unicons';

import Item from './Item';
import './FileLogger.scss';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { clearFileLoggerStatus, selectLoggerFiles } from '../../store/slices/files';
import { useEffect } from 'react';

const FileLoggerModal = (): JSX.Element => {
  const fileHistory = useAppSelector(selectLoggerFiles);
  const dispatch = useAppDispatch();
  const [isOpen, setIsOpen] = useState(false);
  const [hasFinished, setHasFinished] = useState(true);
  const [isMinimized, setIsMinized] = useState(false);

  const Button = ({ children, onClick, style = '' }: { children: JSX.Element | JSX.Element[], onClick?: () => void, style?: string }) => {
    return (
      <div
        onClick={onClick}
        className={`flex items-center justify-center rounded-full bg-neutral-70 cursor-pointer text-white ${style}`}
      >
        { children }
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

  const handleLeavePage = (e) => {
    const confirmationMessage = '';

    e.returnValue = confirmationMessage; //Trident, Chrome 34+
    return confirmationMessage; // WebKit, Chrome <34

  };

  useEffect(() => {
    if (!hasFinished) {
      window.addEventListener('beforeunload', handleLeavePage);

      return () => window.removeEventListener('beforeunload', handleLeavePage);
    }
  }, [hasFinished]);

  return (
    <div className={`file-logger-modal mr-6 mb-6 z-50 absolute bottom-0 right-0 flex flex-col transform duration-300 ${isMinimized ? 'h-10' : 'h-64'} bg-white rounded-md border border-gray-30 overflow-hidden ${!isOpen ? 'hidden' : ''}`}>
      <div className='flex justify-between bg-neutral-900 px-4 py-2.5 rounded-md select-none'>
        <div className='flex items-center w-max'>
          <Button>
            <Unicons.UilSpinnerAlt className="h-5"/>
          </Button>
          <span className='text-sm font-semibold text-white ml-2.5'>Activity</span>
        </div>

        <div className='flex items-center'>
          <Button onClick={() => setIsMinized(!isMinimized)} style={`mr-4 transform duration-500 ${!isMinimized ? 'rotate-180' : 'rotate-0'}`}>
            <Unicons.UilAngleDoubleDown className="h-5" />
          </Button>
          <Button onClick={handleClose}>
            <Unicons.UilTimes className="h-5" />
          </Button>
        </div>
      </div>

      <div className='overflow-y-scroll scrollbar pt-2.5 h-full'>
        {Object.values(fileHistory).map(file => <Item item={file} key={file.filePath} />)}
      </div>
    </div>
  );
};

export default FileLoggerModal;
