import * as Unicons from '@iconscout/react-unicons';
import { useAppDispatch } from '../../../store/hooks';
import { taskManagerThunks } from '../../../store/slices/task-manager';
import { NotificationData, TaskStatus } from '../../../services/task-manager.service';

interface FileLoggerItemProps {
  notification: NotificationData;
}

const FileLoggerItem = ({ notification }: FileLoggerItemProps): JSX.Element => {
  const dispatch = useAppDispatch();
  const icon: JSX.Element = <notification.icon className="flex items-center justify-center mr-2.5 w-6" />;
  const statusClassName = [TaskStatus.Success, TaskStatus.Error].includes(notification.status) ? '' : 'opacity-50';
  const messageClassName = notification.status === TaskStatus.Error ? 'text-red-50' : 'text-neutral-500';
  const onCancelButtonClicked = () => {
    dispatch(taskManagerThunks.cancelTaskThunk(notification.taskId));
  };

  return (
    <div className={`${statusClassName} flex items-center pl-4`}>
      {icon}

      <div className="flex flex-col text-left w-40">
        <span className="text-sm text-neutral-900 truncate">{notification.title}</span>

        <span className={`text-xs ${messageClassName}`}>{notification.subtitle}</span>
      </div>

      <div className="text-red-60 ml-auto cursor-pointer" onClick={onCancelButtonClicked}>
        <Unicons.UilTimes />
      </div>
    </div>
  );
};

export default FileLoggerItem;
