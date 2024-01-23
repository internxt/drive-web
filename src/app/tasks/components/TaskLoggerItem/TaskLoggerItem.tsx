import { useState } from 'react';
import { t } from 'i18next';
import { useRetryDownload } from '../../hooks/useRetryDownload';

import tasksService from '../../services/tasks.service';
import { TaskNotification, TaskStatus } from '../../types';
import { TaskLoggerActions } from '../TaskLoggerActions/TaskLoggerActions';

const DOWNLOAD_CANCELLED_TRANSLATION = t('tasks.download-file.status.cancelled');
const DOWNLOAD_ERROR_TRANSLATION = t('tasks.download-file.status.error');
const DOWNLOAD_FOLDER_CANCELLED_TRANSLATION = t('tasks.download-folder.status.cancelled');
const DOWNLOAD_FOLDER_ERROR_TRANSLATION = t('tasks.download-folder.status.error');

interface TaskLoggerItemProps {
  notification: TaskNotification;
}

const taskStatusTextColors = {
  [TaskStatus.Error]: 'text-red',
  [TaskStatus.Success]: 'text-gray-50',
  [TaskStatus.Cancelled]: 'text-gray-50',
};

const ProgressBar = ({ progress, isPaused }) => {
  return (
    <div
      className={`absolute bottom-0 left-0 ${isPaused ? 'bg-gray-50' : 'bg-primary'} `}
      style={{ height: '2px', width: `${progress}%` }}
    />
  );
};

const TaskLoggerItem = ({ notification }: TaskLoggerItemProps): JSX.Element => {
  const [isHovered, setIsHovered] = useState(false);
  const { retryDownload } = useRetryDownload(notification);

  const progressInPercentage = notification.progress ? (notification.progress * 100).toFixed(0) : 0;
  const notExistProgress = notification.progress && notification.progress === Infinity;
  const progress = notExistProgress ? '-' : progressInPercentage;

  const showProgressBar = notification.status === TaskStatus.InProcess || notification.status === TaskStatus.Paused;
  const isUploadTask = notification.action.includes('upload');

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  const isDownloadError =
    [TaskStatus.Error, TaskStatus.Cancelled].includes(notification.status) &&
    (notification.subtitle.includes(DOWNLOAD_CANCELLED_TRANSLATION) ||
      notification.subtitle.includes(DOWNLOAD_ERROR_TRANSLATION) ||
      notification.subtitle.includes(DOWNLOAD_FOLDER_CANCELLED_TRANSLATION) ||
      notification.subtitle.includes(DOWNLOAD_FOLDER_ERROR_TRANSLATION));

  const messageClassName = taskStatusTextColors[notification.status] ?? 'text-primary';

  const onCancelButtonClicked = () => {
    tasksService.cancelTask(notification.taskId);
    tasksService.removeTask(notification.taskId);
  };

  return (
    <div className="relative">
      <div
        className={'flex h-12 items-center space-x-2 px-2 hover:bg-gray-5'}
        role="none"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <notification.icon className="h-8 w-8 drop-shadow-sm" />
        <div className="flex flex-1 flex-col overflow-hidden text-left" title={notification.title}>
          <span className="truncate text-sm font-medium text-gray-80">{notification.title}</span>

          <span className={`text-sm ${messageClassName}`}>{notification.subtitle}</span>
        </div>
        <TaskLoggerActions
          isHovered={isHovered}
          status={notification.status}
          progress={progress.toString()}
          cancelAction={onCancelButtonClicked}
          retryAction={isDownloadError ? retryDownload : () => {}}
          isUploadTask={isUploadTask}
        />
      </div>
      {showProgressBar && <ProgressBar progress={progress} isPaused={notification.status === TaskStatus.Paused} />}
    </div>
  );
};

export default TaskLoggerItem;
