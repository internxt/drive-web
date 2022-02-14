import UilTimes from '@iconscout/react-unicons/icons/uil-times';

import tasksService from '../../services/tasks.service';
import { TaskNotification, TaskStatus } from '../../types';

interface TaskLoggerItemProps {
  notification: TaskNotification;
}

const TaskLoggerItem = ({ notification }: TaskLoggerItemProps): JSX.Element => {
  const isTaskFinished = tasksService.isTaskFinished(notification.taskId);
  const isTaskProgressCompleted = tasksService.isTaskProgressCompleted(notification.taskId);
  const statusClassName = isTaskFinished ? '' : 'opacity-50';
  const messageClassName = [TaskStatus.Error, TaskStatus.Cancelled].includes(notification.status)
    ? 'text-red-50'
    : 'text-neutral-500';
  const onCancelButtonClicked = () => {
    tasksService.cancelTask(notification.taskId);
  };

  return (
    <div className={`${statusClassName} flex items-center px-4`}>
      <notification.icon className="flex items-center justify-center mr-2.5 w-6 h-6" />

      <div className="flex flex-col text-left w-40">
        <span className="text-sm text-neutral-900 truncate">{notification.title}</span>

        <span className={`text-xs ${messageClassName}`}>{notification.subtitle}</span>
      </div>

      {notification.isTaskCancellable && !isTaskProgressCompleted && !isTaskFinished && (
        <div className="text-red-60 ml-auto cursor-pointer" onClick={onCancelButtonClicked}>
          <UilTimes />
        </div>
      )}
    </div>
  );
};

export default TaskLoggerItem;
