import { t } from 'i18next';
import { ArrowClockwise, XCircle } from 'phosphor-react';
import { useRetryDownload } from '../../hooks/useRetryDownload';

import tasksService from '../../services/tasks.service';
import { TaskNotification, TaskStatus } from '../../types';

interface TaskLoggerItemProps {
  notification: TaskNotification;
}

const TaskLoggerItem = ({ notification }: TaskLoggerItemProps): JSX.Element => {
  const DOWNLOAD_CANCELLED_TRANSLATION = t('tasks.download-file.status.cancelled');
  const DOWNLOAD_ERROR_TRANSLATION = t('tasks.download-file.status.error');
  const DOWNLOAD_FOLDER_CANCELLED_TRANSLATION = t('tasks.download-folder.status.cancelled');
  const DOWNLOAD_FOLDER_ERROR_TRANSLATION = t('tasks.download-folder.status.error');
  const { retryDownload } = useRetryDownload(notification);

  const isTaskFinished = tasksService.isTaskFinished(notification.taskId);
  const isTaskProgressCompleted = tasksService.isTaskProgressCompleted(notification.taskId);
  const isDownloadError =
    [TaskStatus.Error, TaskStatus.Cancelled].includes(notification.status) &&
    (notification.subtitle.includes(DOWNLOAD_CANCELLED_TRANSLATION) ||
      notification.subtitle.includes(DOWNLOAD_ERROR_TRANSLATION) ||
      notification.subtitle.includes(DOWNLOAD_FOLDER_CANCELLED_TRANSLATION) ||
      notification.subtitle.includes(DOWNLOAD_FOLDER_ERROR_TRANSLATION));
  const messageClassName = [TaskStatus.Error].includes(notification.status)
    ? 'text-red-50'
    : [TaskStatus.Success, TaskStatus.Cancelled].includes(notification.status)
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
      {isDownloadError && (
        <ArrowClockwise size={24} weight="fill" className="cursor-pointer text-gray-60" onClick={retryDownload} />
      )}
    </div>
  );
};

export default TaskLoggerItem;
