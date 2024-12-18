import { useState } from 'react';
import { useSelector } from 'react-redux';
import { useOpenItem } from '../../hooks/useOpen';
import { useRetryDownload, useRetryUpload } from '../../hooks/useRetry';

import { t } from 'i18next';
import errorService from '../../../core/services/error.service';
import notificationsService, { ToastType } from '../../../notifications/services/notifications.service';
import { useReduxActions } from '../../../store/slices/storage/hooks/useReduxActions';
import tasksService from '../../services/tasks.service';
import { TaskData, TaskNotification, TaskStatus, TaskType, UploadFileData, UploadFolderData } from '../../types';
import { TaskLoggerActions } from '../TaskLoggerActions/TaskLoggerActions';
import workspacesSelectors from 'app/store/slices/workspaces/workspaces.selectors';

const THREE_HUNDRED_MB_IN_BYTES = 3 * 100 * 1024 * 1024;
interface TaskLoggerItemProps {
  notification: TaskNotification;
  task?: TaskData;
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

const isASingleFileUpload = (item: TaskNotification['item']): item is UploadFileData => {
  if (!item) return false;

  return 'uploadFile' in item && 'parentFolderId' in item;
};

const isUploadFolderData = (item: TaskNotification['item']): item is UploadFolderData => {
  if (!item) return false;

  return 'folder' in item && 'parentFolderId' in item;
};

const shouldDisplayPauseButton = (notification: TaskNotification): boolean => {
  const item = notification.item;
  const isProgressBiggerThanEightyFivePercent = notification?.progress > 0.85;

  if (isProgressBiggerThanEightyFivePercent) return false;

  if (isASingleFileUpload(item)) {
    const isBiggerThan300MB = item?.uploadFile?.size >= THREE_HUNDRED_MB_IN_BYTES;
    return isBiggerThan300MB;
  } else if (isUploadFolderData(item)) {
    return true;
  }

  return false;
};

const resetTaskProgress = (notification: TaskNotification) => {
  tasksService.updateTask({
    taskId: notification.taskId,
    merge: { status: TaskStatus.InProcess, progress: 0 },
  });
};

const TaskLoggerItem = ({ notification, task }: TaskLoggerItemProps): JSX.Element => {
  const [isHovered, setIsHovered] = useState(false);
  const [isRetryActionDisabled, setIsRetryActionDisabled] = useState(false);
  const selectedWorkspace = useSelector(workspacesSelectors.getSelectedWorkspace);

  const { openItem } = useOpenItem({
    notification,
    showOpenFolderError() {
      notificationsService.show({
        text: t('tasks.generalErrorMessages.openUploadedFileFailed'),
        type: ToastType.Error,
      });
    },
    showOpenFileError() {
      notificationsService.show({
        text: t('tasks.generalErrorMessages.openUploadedFolderFailed'),
        type: ToastType.Error,
      });
    },
    selectedWorkspace,
  });
  const { downloadItemsAsZip, downloadItems, uploadFolder, uploadItem, uploadSharedItem } = useReduxActions();
  const { retryDownload } = useRetryDownload({
    notification,
    task,
    downloadItemsAsZip,
    downloadItems,
    showErrorNotification() {
      notificationsService.show({ text: t('tasks.generalErrorMessages.retryDownloadFailed'), type: ToastType.Error });
    },
    resetProgress: resetTaskProgress,
  });
  const { retryUpload } = useRetryUpload({
    notification,
    uploadFolder,
    uploadItem,
    uploadSharedItem,
    showErrorNotification() {
      notificationsService.show({ text: t('tasks.generalErrorMessages.retryUploadFailed'), type: ToastType.Error });
    },
    resetProgress: resetTaskProgress,
  });

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
    (notification.action === TaskType.DownloadFile || notification.action === TaskType.DownloadFolder);

  const getRetryActionFunction = (isDownload: boolean) => {
    return isDownload ? retryDownload : retryUpload;
  };

  const retryFunction = getRetryActionFunction(isDownloadError);

  const handleRetryClick = () => {
    if (!isRetryActionDisabled) {
      errorService.addBreadcrumb({
        level: 'info',
        category: 'button',
        message: 'Retry button clicked',
        data: {
          task,
        },
      });
      retryFunction();
      setIsRetryActionDisabled(true);
      setTimeout(() => {
        setIsRetryActionDisabled(false);
      }, 3000);
    }
  };

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
        <div className="flex flex-1 flex-col overflow-hidden text-left">
          <span className="truncate text-sm font-medium text-gray-80" title={notification.title}>
            {notification.title}
          </span>
          <span className={`text-sm ${messageClassName}`}>{notification.subtitle}</span>
        </div>
        <TaskLoggerActions
          taskId={notification.taskId}
          isHovered={isHovered}
          status={notification.status}
          progress={progress.toString()}
          nItems={notification.nItems?.toString() ?? '0'}
          cancelAction={onCancelButtonClicked}
          retryAction={handleRetryClick}
          isUploadTask={isUploadTask}
          openItemAction={openItem}
          showPauseButton={shouldDisplayPauseButton(notification)}
        />
      </div>
      {showProgressBar && <ProgressBar progress={progress} isPaused={notification.status === TaskStatus.Paused} />}
    </div>
  );
};

export default TaskLoggerItem;
