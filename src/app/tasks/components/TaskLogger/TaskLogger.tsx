import { Fragment, useState, useEffect } from 'react';
import UilAngleDown from '@iconscout/react-unicons/icons/uil-angle-down';
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
      className={`file-logger-modal absolute bottom-0 right-0 z-50 mr-6 mb-6 flex transform flex-col duration-300 ${
        isMinimized ? 'h-10' : 'h-64'
      } overflow-hidden rounded-md border border-gray-30 bg-white ${!isOpen ? 'hidden' : ''}`}
    >
      <div className="flex select-none justify-between rounded-t-md bg-neutral-900 px-4 py-2.5">
        <div className="flex w-max items-center text-sm font-semibold text-white">
          {hasFinished ? (
            <span>{i18n.get('tasks.messages.allProcessesHaveFinished')}</span>
          ) : (
            <Fragment>
              <img className="mr-2 animate-spin" src={spinnerIcon} alt="" />

              <span>{`Processing ${Object.values(finishedNotifications).length} of ${allNotifications.length}`}</span>
            </Fragment>
          )}
        </div>

        <div className="flex items-center">
          <div
            onClick={() => setIsMinized(!isMinimized)}
            className={`mr-2 transform text-white duration-300 ${
              isMinimized ? 'rotate-180' : 'rotate-0'
            } cursor-pointer`}
          >
            <UilAngleDown className="h-5" />
          </div>

          <div
            className={`${hasFinished ? 'cursor-pointer' : 'cursor-not-allowed'} cursor-pointer`}
            onClick={onCloseButtonClicked}
          >
            <UilTimes className={`h-5 ${hasFinished ? 'text-white' : 'text-neutral-100'}`} />
          </div>
        </div>
      </div>

      <div className="h-full overflow-y-scroll pt-2.5">{items}</div>
    </div>
  );
};

export default TaskLogger;
