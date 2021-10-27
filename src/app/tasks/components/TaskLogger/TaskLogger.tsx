import { Fragment, useState, useEffect } from 'react';
import UilAngleDoubleDown from '@iconscout/react-unicons/icons/uil-angle-double-down';
import UilTimes from '@iconscout/react-unicons/icons/uil-times';

import TaskLoggerItem from '../TaskLoggerItem/TaskLoggerItem';
import spinnerIcon from '../../../../assets/icons/spinner.svg';
import { TaskStatus } from '../../types';
import { useTaskManagerGetNotifications } from '../../hooks';
import tasksService from '../../services/tasks.service';
import i18n from '../../../i18n/services/i18n.service';

import './TaskLogger.scss';
import { uiActions } from '../../../store/slices/ui';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';

const TaskLogger = (): JSX.Element => {
  const dispatch = useAppDispatch();
  const isOpen = useAppSelector((state) => state.ui.isFileLoggerOpen);
  const [hasFinished, setHasFinished] = useState(true);
  const [isMinimized, setIsMinized] = useState(false);
  const allNotifications = useTaskManagerGetNotifications();
  const finishedNotifications = useTaskManagerGetNotifications({
    status: [TaskStatus.Error, TaskStatus.Success, TaskStatus.Cancelled],
  });
  const items: JSX.Element[] = allNotifications.map((n) => <TaskLoggerItem notification={n} key={n.taskId} />);
  const onCloseButtonClicked = () => {
    if (hasFinished) {
      dispatch(uiActions.setIsFileLoggerOpen(false));
      tasksService.clearTasks();
    }
  };

  const handleLeavePage = (e) => {
    const confirmationMessage = '';

    e.returnValue = confirmationMessage; //Trident, Chrome 34+
    return confirmationMessage; // WebKit, Chrome <34
  };

  useEffect(() => {
    const processingItems = allNotifications.findIndex(
      (notification) => !tasksService.isTaskFinished(notification.taskId),
    );

    if (processingItems !== -1) {
      setHasFinished(false);
    } else {
      setHasFinished(true);
    }
  }, [allNotifications]);

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
          {hasFinished ? (
            <span>{i18n.get('tasks.messages.allProcessesHaveFinished')}</span>
          ) : (
            <Fragment>
              <img className="animate-spin mr-2" src={spinnerIcon} alt="" />

              <span>{`Processing ${Object.values(finishedNotifications).length} of ${allNotifications.length}`}</span>
            </Fragment>
          )}
        </div>

        <div className="flex items-center">
          <div
            onClick={() => setIsMinized(!isMinimized)}
            className={`mr-2 transform duration-300 text-white ${
              isMinimized ? 'rotate-180' : 'rotate-0'
            } cursor-pointer`}
          >
            <UilAngleDoubleDown className="h-5" />
          </div>

          <div
            className={`${hasFinished ? 'cursor-pointer' : 'cursor-not-allowed'} cursor-pointer`}
            onClick={onCloseButtonClicked}
          >
            <UilTimes className={`h-5 ${hasFinished ? 'text-white' : 'text-m-neutral-100'}`} />
          </div>
        </div>
      </div>

      <div className="overflow-y-scroll scrollbar pt-2.5 h-full">{items}</div>
    </div>
  );
};

export default TaskLogger;
