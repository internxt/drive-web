import { useState } from 'react';
import { useSelector } from 'react-redux';
import { useOpenItem } from '../../hooks/useOpen';
import { useRetryDownload, useRetryUpload } from '../../hooks/useRetry';

import { t } from 'i18next';
import notificationsService, { ToastType } from '../../../notifications/services/notifications.service';
import { useReduxActions } from '../../../store/slices/storage/hooks/useReduxActions';
import tasksService from '../../services/tasks.service';
import { TaskData, TaskNotification, TaskStatus, TaskType, UploadFileData, UploadFolderData } from '../../types';
import { TaskLoggerActions } from '../TaskLoggerActions/TaskLoggerActions';
import workspacesSelectors from 'app/store/slices/workspaces/workspaces.selectors';
import TaskToRetry from '../TaskToRetry/TaskToRetry';
import { RetryableTask } from 'app/network/RetryManager';

const THREE_HUNDRED_MB_IN_BYTES = 3 * 100 * 1024 * 1024;
interface TaskLoggerItemProps {
  notification: TaskNotification;
  task?: TaskData;
  filesToRetry: RetryableTask[];
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

const TaskLoggerItem = ({ notification, task, filesToRetry }: TaskLoggerItemProps): JSX.Element => {
  const [isHovered, setIsHovered] = useState(false);
  const [isRetryActionDisabled, setIsRetryActionDisabled] = useState(false);
  const selectedWorkspace = useSelector(workspacesSelectors.getSelectedWorkspace);
  const workspaceCredentials = useSelector(workspacesSelectors.getWorkspaceCredentials);
  const [isModalOpen, setIsModalOpen] = useState(false);

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
  const { uploadFolder, uploadItem, uploadSharedItem } = useReduxActions();
  const { retryDownload } = useRetryDownload({
    notification,
    task,
    showErrorNotification() {
      notificationsService.show({ text: t('tasks.generalErrorMessages.retryDownloadFailed'), type: ToastType.Error });
    },
    resetProgress: resetTaskProgress,
    selectedWorkspace,
    workspaceCredentials,
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

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  const isDownloadAction =
    [TaskStatus.Error, TaskStatus.Cancelled].includes(notification.status) &&
    (notification.action === TaskType.DownloadFile || notification.action === TaskType.DownloadFolder);
  const someFileIsDownloaded = filesToRetry?.some(
    (file) => file.taskId === notification.taskId && file.type === 'download',
  );

  const isDownloadError = isDownloadAction || someFileIsDownloaded;

  const getRetryActionFunction = (isDownload: boolean) => {
    return isDownload ? retryDownload : retryUpload;
  };

  const retryFunction = getRetryActionFunction(isDownloadError);

  const handleRetryClick = () => {
    if (!isRetryActionDisabled) {
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
      <TaskToRetry isOpen={isModalOpen} files={filesToRetry ?? []} onClose={() => setIsModalOpen(false)} />
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
          downloadedProgress={notification.downloadedProgress}
          cancelAction={onCancelButtonClicked}
          retryAction={handleRetryClick}
          taskType={notification.action}
          openItemAction={openItem}
          openRetryItemsAction={() => setIsModalOpen(true)}
          showPauseButton={shouldDisplayPauseButton(notification)}
          haveWarnings={filesToRetry?.length > 0}
        />
      </div>
      {showProgressBar && <ProgressBar progress={progress} isPaused={notification.status === TaskStatus.Paused} />}
    </div>
  );
};

export default TaskLoggerItem;
