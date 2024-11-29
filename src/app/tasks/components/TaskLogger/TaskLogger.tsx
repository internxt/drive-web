import { Fragment, useEffect, useState } from 'react';

import { useTaskManagerGetNotifications } from '../../hooks';
import tasksService from '../../services/tasks.service';
import { TaskStatus } from '../../types';
import TaskLoggerItem from '../TaskLoggerItem/TaskLoggerItem';

import { CaretDown, CircleNotch, X } from '@phosphor-icons/react';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { uiActions } from '../../../store/slices/ui';

const TaskLogger = (): JSX.Element => {
  const { translate } = useTranslationContext();
  const dispatch = useAppDispatch();
  const isOpen = useAppSelector((state) => state.ui.isFileLoggerOpen);
  const [hasFinished, setHasFinished] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);
  const allNotifications = useTaskManagerGetNotifications();
  const finishedNotifications = useTaskManagerGetNotifications({
    status: [TaskStatus.Error, TaskStatus.Success, TaskStatus.Cancelled],
  });
  const items: JSX.Element[] = allNotifications.map((n) => (
    <TaskLoggerItem notification={n} task={tasksService.findTask(n.taskId)} key={n.taskId} />
  ));
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
      className={`absolute bottom-5 right-5 z-40 flex w-96 flex-col shadow-subtle-hard transition-height duration-350 ${
        isMinimized ? 'h-11' : 'h-72'
      } overflow-hidden rounded-xl border border-gray-10 bg-surface dark:bg-gray-1 ${!isOpen ? 'hidden' : ''}`}
    >
      <div className="flex select-none justify-between border-b border-gray-10 bg-gray-5 px-3 py-2.5">
        <div className="flex w-max items-center text-sm font-medium text-gray-60">
          {hasFinished ? (
            <span>{translate('tasks.messages.allProcessesHaveFinished')}</span>
          ) : (
            <Fragment>
              <CircleNotch size={16} className="mr-2 animate-spin text-gray-60" weight="bold" />

              <span>
                {translate('tasks.messages.processing', {
                  pending: Object.values(finishedNotifications).length,
                  finished: allNotifications.length,
                })}
              </span>
            </Fragment>
          )}
        </div>

        <div className="flex items-center text-gray-60">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className={` duration-300 ${isMinimized ? 'rotate-180' : 'rotate-0'} cursor-pointer`}
          >
            <CaretDown size={24} />
          </button>

          <button
            className={`${hasFinished ? 'cursor-pointer' : 'cursor-not-allowed'} ml-4 cursor-pointer`}
            onClick={onCloseButtonClicked}
          >
            <X size={24} />
          </button>
        </div>
      </div>

      <div className="h-full overflow-y-scroll py-2">{items}</div>
    </div>
  );
};

export default TaskLogger;
