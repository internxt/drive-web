import { ListChildComponentProps } from 'react-window';
import RestartIcon from '../../../../assets/icons/tasklogger/circle-arrow.svg?react';
import iconService from 'app/drive/services/icon.service';
import { bytesToString } from 'app/drive/services/size.service';
import { formatDefaultDate } from 'services/date.service';
import { t } from 'i18next';
import { TaskLoggerButton } from '../TaskLoggerButton/TaskLoggerButton';
import { CircleNotch } from '@phosphor-icons/react';
import { RetryableTask } from 'app/network/RetryManager';

interface DisplayData {
  name: string;
  type?: string;
  size: number;
  modifiedAt: number | string;
  isFolder: boolean;
}

const getDisplayData = (params: RetryableTask['params']): DisplayData => ({
  name: params?.filecontent?.name ?? params.plainName ?? params.name,
  type: params?.filecontent?.type ?? params.type,
  size: params?.filecontent?.size ?? params.size,
  modifiedAt: params?.filecontent?.content.lastModified ?? params.updatedAt,
  isFolder: Boolean(params?.isFolder),
});

const withExtension = (name: string, type?: string): string =>
  type && !name?.toLowerCase().endsWith(`.${type.toLowerCase()}`) ? `${name}.${type}` : name;

const TaskToRetyItem = ({ index, style, data }: ListChildComponentProps) => {
  const file: RetryableTask = data.files[index];
  const { params, status, retryable } = file;
  const { downloadItem } = data;
  const isNotAllowed = retryable === false;
  const getFileIcon = (type: string) => {
    const IconComponent = iconService.getItemIcon(false, type);
    return <IconComponent className="w-10 h-10 text-gray-600" />;
  };
  const FolderIcon = iconService.getItemIcon(true);
  const getFolderIcon = <FolderIcon className="w-12 h-12 drop-shadow-soft" />;

  const { name, type, size, modifiedAt, isFolder } = getDisplayData(params);
  const displayName = withExtension(name, type);
  const displaySize = bytesToString(size, false).replace('kB', 'KB');

  const isLastItem = index === data.files.length - 1;

  return (
    <div
      style={style}
      className={`flex items-center justify-between px-1 py-3 ${isLastItem ? '' : 'border-b border-gray-5'}`}
    >
      <div className="flex items-center gap-4">
        {isFolder ? getFolderIcon : getFileIcon(type ?? '')}
        <div>
          <p className="text-base font-medium text-gray-100 truncate max-w-xs">{displayName}</p>
          <p className="text-sm font-regular text-gray-50">
            {displaySize} - {formatDefaultDate(modifiedAt, t)}
          </p>
        </div>
      </div>
      {isNotAllowed && <span className="mr-2 text-sm font-medium text-gray-50">{t('tasks.messages.notAllowed')}</span>}
      {!isNotAllowed && status === 'failed' && (
        <TaskLoggerButton onClick={() => downloadItem(file)} Icon={RestartIcon} sizeClassName="h-8 w-8" iconSize={16} />
      )}
      {!isNotAllowed && status === 'retrying' && (
        <CircleNotch size={16} className="mr-2 animate-spin text-gray-60" weight="bold" />
      )}
    </div>
  );
};

export default TaskToRetyItem;
