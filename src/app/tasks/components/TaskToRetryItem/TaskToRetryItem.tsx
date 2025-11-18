import { ListChildComponentProps } from 'react-window';
import RestartIcon from '../../../../assets/icons/tasklogger/circle-arrow.svg?react';
import iconService from 'app/drive/services/icon.service';
import { bytesToString } from 'app/drive/services/size.service';
import { formatDefaultDate } from 'services/date.service';
import { t } from 'i18next';
import { TaskLoggerButton } from '../TaskLoggerButton/TaskLoggerButton';
import { CircleNotch } from '@phosphor-icons/react';
import { RetryableTask } from 'app/network/RetryManager';

const TaskToRetyItem = ({ index, style, data }: ListChildComponentProps) => {
  const file: RetryableTask = data.files[index];
  const { params, status } = file;
  const { downloadItem } = data;
  const getFileIcon = (type: string) => {
    const IconComponent = iconService.getItemIcon(false, type);
    return <IconComponent className="w-10 h-10 text-gray-600" />;
  };
  const FolderIcon = iconService.getItemIcon(true);
  const getFolderIcon = <FolderIcon className="w-12 h-12 drop-shadow-soft" />;

  return (
    <div style={style} className="flex items-center justify-between px-4 py-3 border-b border-gray-5">
      <div className="flex items-center gap-4">
        {params?.isFolder ? getFolderIcon : getFileIcon(params?.filecontent?.type ?? params.type)}
        <div>
          <p className="text-base font-medium text-gray-100 truncate max-w-xs">
            {params?.filecontent?.name ?? params.plainName ?? params.name}
          </p>
          <p className="text-sm font-regular text-gray-50">
            {bytesToString(params?.filecontent?.size ?? params.size)} -{' '}
            {formatDefaultDate(params?.filecontent?.content.lastModified ?? params.updatedAt, t)}
          </p>
        </div>
      </div>
      {status === 'failed' && <TaskLoggerButton onClick={() => downloadItem(file)} Icon={RestartIcon} />}
      {status === 'retrying' && <CircleNotch size={24} className="mr-2 animate-spin text-gray-60" weight="bold" />}
    </div>
  );
};

export default TaskToRetyItem;
