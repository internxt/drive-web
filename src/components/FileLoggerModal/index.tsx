import { Fragment, useState } from 'react';
import * as Unicons from '@iconscout/react-unicons';

import Item from './Item';
import './FileLogger.scss';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { clearFileLoggerStatus, selectFinishedFiles, selectLoggerFiles } from '../../store/slices/files';
import { useEffect } from 'react';
import { getIcon } from '../../services/icon.service';

const FileLoggerModal = (): JSX.Element => {
  const fileHistory = useAppSelector(selectLoggerFiles);
  const dispatch = useAppDispatch();
  const [isOpen, setIsOpen] = useState(false);
  const [hasFinished, setHasFinished] = useState(true);
  const [isMinimized, setIsMinized] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const finishedEntries = useAppSelector(selectFinishedFiles);

  const handleClose = () => {
    if (hasFinished) {
      setIsOpen(false);
      dispatch(clearFileLoggerStatus());
    }
  };

  useEffect(() => {
    if (Object.values(fileHistory).length) {
      setIsOpen(true);

      for (const key in fileHistory) {
        if (fileHistory[key].action === 'download') {
          setIsDownloading(true);
        }
        if (fileHistory[key].action === 'upload') {
          setIsUploading(true);
        }
      }

      const processingItems = Object.values(fileHistory).findIndex(item => item.status !== 'success' && item.status !== 'error');

      if (processingItems !== -1) {
        setHasFinished(false);
      } else {
        setHasFinished(true);
        setIsDownloading(false);
        setIsUploading(false);
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
    <div className={`file-logger-modal mr-6 mb-6 z-50 absolute bottom-0 right-0 flex flex-col transform delay-300 duration-300 ${isMinimized ? 'h-10' : 'h-64'} bg-white rounded-md border border-gray-30 overflow-hidden ${!isOpen ? 'hidden' : ''}`}>
      <div className='flex justify-between bg-neutral-900 px-4 py-2.5 rounded-t-md select-none'>
        <div className='flex items-center w-max text-sm text-white font-semibold'>
          {!hasFinished ?
            <Fragment>
              <img className='animate-spin mr-2' src={getIcon('spinner')} alt="" />

              {isDownloading && isUploading ?
                'Multiple processes running'
                :
                <Fragment>
                  {!isDownloading ?
                    `Uploading ${Object.values(finishedEntries).length} of ${Object.values(fileHistory).length}`
                    :
                    `Downloading ${Object.values(finishedEntries).length} of ${Object.values(fileHistory).length}`
                  }
                </Fragment>
              }
            </Fragment>
            :
            'All processes were finished'
          }
        </div>

        <div className='flex items-center'>
          <div onClick={() => setIsMinized(!isMinimized)} className={`mr-2 transform duration-300 text-white ${!isMinimized ? 'rotate-180' : 'rotate-0'} cursor-pointer`}>
            <Unicons.UilAngleDoubleDown className="h-5" />
          </div>

          <div onClick={() => handleClose()}>
            <Unicons.UilTimes className={`h-5 ${hasFinished ? 'text-white' : 'text-m-neutral-100'}`} />
          </div>
        </div>
      </div>

      <div className='overflow-y-scroll scrollbar pt-2.5 h-full'>
        {Object.values(fileHistory).map(file => <Item item={file} key={file.filePath} />)}
      </div>
    </div>
  );
};

export default FileLoggerModal;
