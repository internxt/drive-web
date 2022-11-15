import { ArrowDown, ArrowUp, Check, WarningOctagon, XCircle } from 'phosphor-react';
import tasksService from '../../services/tasks.service';
import { TaskNotification, TaskStatus, TaskType } from '../../types';

interface TaskLoggerItemProps {
  notification: TaskNotification;
}

const TaskLoggerItem = ({ notification }: TaskLoggerItemProps): JSX.Element => {
  const isTaskFinished = tasksService.isTaskFinished(notification.taskId);
  const isTaskProgressCompleted = tasksService.isTaskProgressCompleted(notification.taskId);

  const uploadTypes = [TaskType.UploadFile, TaskType.UploadFolder];
  const downloadTypes = [TaskType.DownloadFile, TaskType.DownloadFolder, TaskType.DownloadBackup, TaskType.DownloadPhotos];
  const defaultStatusIconClass = 'h-5 w-5 absolute -bottom-1 right-0 text-white';
  const roundedStatusIconClass = 'rounded-full border-2 border-white p-0.5';
  let messageClassName = 'text-gray-50';
  let statusIcon = <></>;

  switch (notification.status) {
    case TaskStatus.Error:
      messageClassName = 'text-red-50';
      statusIcon = <WarningOctagon className={`${defaultStatusIconClass} -right-0.5`} weight={'fill'} color={'red'} />;
      break;
    case TaskStatus.Cancelled:
      messageClassName = 'text-red-50';
      statusIcon = <WarningOctagon className={`${defaultStatusIconClass} -right-0.5`} weight={'fill'} color={'red'} />;
      break;
    case TaskStatus.Success:
      messageClassName = 'text-green';
      statusIcon = <Check className={`${defaultStatusIconClass} ${roundedStatusIconClass} bg-green`} />;
      break;
    case TaskStatus.InProcess:
      messageClassName = 'text-primary';

      if (uploadTypes.includes(notification.action)) {
        statusIcon = <ArrowUp className={`${defaultStatusIconClass} ${roundedStatusIconClass} bg-primary`} />;
      } else if (downloadTypes.includes(notification.action)) {
        statusIcon = <ArrowDown className={`${defaultStatusIconClass} ${roundedStatusIconClass} bg-primary`} />;
      }
      break;
  }

  const onCancelButtonClicked = () => {
    tasksService.cancelTask(notification.taskId);
  };

  return (
    <div className={'flex items-center space-x-2 px-2'}>
      <div className='relative'>
        <notification.icon className="h-8 w-8" />
        {statusIcon}
      </div>

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
