import { Fragment, useState } from 'react';
import * as Unicons from '@iconscout/react-unicons';

import FileLoggerItem from './FileLoggerItem/FileLoggerItem';
import './FileLogger.scss';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { useEffect } from 'react';
import spinnerIcon from '../../assets/icons/spinner.svg';
import { tasksActions, tasksSelectors } from '../../store/slices/tasks';
import { TaskStatus, TaskType } from '../../models/enums';

const FileLogger = (): JSX.Element => {
  const notifications = useAppSelector((state) => state.tasks.notifications);
  const dispatch = useAppDispatch();
  const [isOpen, setIsOpen] = useState(false);
  const [hasFinished, setHasFinished] = useState(true);
  const [isMinimized, setIsMinized] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const finishedNotifications = useAppSelector(tasksSelectors.getFinishedNotifications);
  const items: JSX.Element[] = notifications.map((n) => <FileLoggerItem item={n} key={n.uuid} />);
  const handleClose = () => {
    if (hasFinished) {
      setIsOpen(false);
      dispatch(tasksActions.clearNotifications());
    }
  };
  const handleLeavePage = (e) => {
    const confirmationMessage = '';

    e.returnValue = confirmationMessage; //Trident, Chrome 34+
    return confirmationMessage; // WebKit, Chrome <34
  };

  useEffect(() => {
    if (Object.values(notifications).length) {
      setIsOpen(true);

      for (const notification of notifications) {
        if (notification.action === TaskType.DownloadFile || notification.action === TaskType.DownloadFolder) {
          setIsDownloading(true);
        }
        if (notification.action === TaskType.UploadFile || notification.action === TaskType.UploadFolder) {
          setIsUploading(true);
        }
      }

      const processingItems = notifications.findIndex(
        (item) => item.status !== TaskStatus.Success && item.status !== TaskStatus.Error,
      );

      if (processingItems !== -1) {
        setHasFinished(false);
      } else {
        setHasFinished(true);
        setIsDownloading(false);
        setIsUploading(false);
      }
    }
  }, [notifications]);

  useEffect(() => {
    if (!hasFinished) {
      window.addEventListener('beforeunload', handleLeavePage);

      return () => window.removeEventListener('beforeunload', handleLeavePage);
    }
  }, [hasFinished]);

  return (
    <div
      className={`file-logger-modal mr-6 mb-6 z-50 absolute bottom-0 right-0 flex flex-col transform duration-300 ${
        isMinimized ? 'h-10' : 'h-64'
      } bg-white rounded-md border border-gray-30 overflow-hidden ${!isOpen ? 'hidden' : ''}`}
    >
      <div className="flex justify-between bg-neutral-900 px-4 py-2.5 rounded-t-md select-none">
        <div className="flex items-center w-max text-sm text-white font-semibold">
          {!hasFinished ? (
            <Fragment>
              <img className="animate-spin mr-2" src={spinnerIcon} alt="" />

              {isDownloading && isUploading ? (
                'Multiple processes running'
              ) : (
                <Fragment>
                  {!isDownloading
                    ? `Uploading ${Object.values(finishedNotifications).length} of ${notifications.length}`
                    : `Downloading ${Object.values(finishedNotifications).length} of ${notifications.length}`}
                </Fragment>
              )}
            </Fragment>
          ) : (
            'All processes were finished'
          )}
        </div>

        <div className="flex items-center">
          <div
            onClick={() => setIsMinized(!isMinimized)}
            className={`mr-2 transform duration-300 text-white ${
              isMinimized ? 'rotate-180' : 'rotate-0'
            } cursor-pointer`}
          >
            <Unicons.UilAngleDoubleDown className="h-5" />
          </div>

          <div className="cursor-pointer" onClick={handleClose}>
            <Unicons.UilTimes className={`h-5 ${hasFinished ? 'text-white' : 'text-m-neutral-100'}`} />
          </div>
        </div>
      </div>

      <div className="overflow-y-scroll scrollbar pt-2.5 h-full">{items}</div>
    </div>
  );
};

export default FileLogger;
