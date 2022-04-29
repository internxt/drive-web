import { XCircle } from 'phosphor-react';

import tasksService from '../../services/tasks.service';
import { TaskNotification, TaskStatus } from '../../types';

interface TaskLoggerItemProps {
  notification: TaskNotification;
}

const TaskLoggerItem = ({ notification }: TaskLoggerItemProps): JSX.Element => {
  const isTaskFinished = tasksService.isTaskFinished(notification.taskId);
  const isTaskProgressCompleted = tasksService.isTaskProgressCompleted(notification.taskId);
  const messageClassName = [TaskStatus.Error, TaskStatus.Cancelled].includes(notification.status)
    ? 'text-red-50'
    : notification.status === TaskStatus.Success
    ? 'text-gray-50'
    : 'text-primary';
  const onCancelButtonClicked = () => {
    tasksService.cancelTask(notification.taskId);
  };

  return (
    <div className={'flex items-center space-x-2 px-2'}>
      <notification.icon className="h-8 w-8" />

      <div className="flex flex-1 flex-col overflow-hidden text-left">
        <span className="truncate text-sm font-medium text-gray-80">{notification.title}</span>

        <span className={`text-sm ${messageClassName}`}>{notification.subtitle}</span>
      </div>

      {notification.isTaskCancellable && !isTaskProgressCompleted && !isTaskFinished && (
        <XCircle size={24} weight="fill" className="cursor-pointer text-gray-60" onClick={onCancelButtonClicked} />
      )}
    </div>
  );
};

export default TaskLoggerItem;
