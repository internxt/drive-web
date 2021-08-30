import { TaskStatus } from '../../../models/enums';
import { NotificationData } from '../../../models/interfaces';
import i18n from '../../../services/i18n.service';
import iconService from '../../../services/icon.service';
import { getItemFullName } from '../../../services/storage.service/storage-name.service';

interface ItemProps {
  item: NotificationData;
}

const FileLoggerItem = ({ item }: ItemProps): JSX.Element => {
  const IconComponent = iconService.getItemIcon(item.isFolder, item.type || '');
  const fullName = getItemFullName(item.name, item.type);
  const icon: JSX.Element = <IconComponent className="flex items-center justify-center mr-2.5 w-6" />;
  const statusClassName = [TaskStatus.Success, TaskStatus.Error].includes(item.status) ? '' : 'opacity-50';
  const message: string = i18n.get(`tasks.${item.action}.${item.status}`, {
    progress: item.progress ? (item.progress * 100).toFixed(2) : 0,
  });
  const messageClassName = item.status === TaskStatus.Error ? 'text-red-50' : 'text-neutral-500';

  return (
    <div className={`${statusClassName} flex items-center px-4`}>
      {icon}

      <div className="flex flex-col text-left w-40">
        <span className="text-sm text-neutral-900 truncate">{fullName}</span>

        <span className={`text-xs ${messageClassName}`}>{message}</span>
      </div>
    </div>
  );
};

export default FileLoggerItem;
