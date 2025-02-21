import { ListChildComponentProps } from 'react-window';
import { ReactComponent as RestartIcon } from '../../../../assets/icons/tasklogger/circle-arrow.svg';
import { ReactComponent as Success } from '../../../../assets/icons/tasklogger/success-check.svg';
import iconService from 'app/drive/services/icon.service';
import { bytesToString } from 'app/drive/services/size.service';
import { formatDefaultDate } from 'app/core/services/date.service';
import { t } from 'i18next';
import { TaskLoggerButton } from '../TaskLoggerButton/TaskLoggerButton';
import { FileToRetry } from 'app/store/slices/storage/fileRetrymanager';
import { CircleNotch } from '@phosphor-icons/react';

const TaskToRetyItem = ({ index, style, data }: ListChildComponentProps) => {
  const file: FileToRetry = data.files[index];
  const { downloadItem } = data;
  const getFileIcon = (type: string) => {
    const IconComponent = iconService.getItemIcon(false, type);
    return <IconComponent className="w-10 h-10 text-gray-600" />;
  };

  return (
    <div style={style} className="flex items-center justify-between px-4 py-3 border-b border-gray-5">
      <div className="flex items-center gap-4">
        {getFileIcon(file.params.filecontent.type)}
        <div>
          <p className="text-base font-medium text-gray-100 truncate max-w-xs">{file.params.filecontent.name}</p>
          <p className="text-sm font-regular text-gray-50">
            {bytesToString(file.params.filecontent.size)} -{' '}
            {formatDefaultDate(file.params.filecontent.content.lastModified, t)}
          </p>
        </div>
      </div>
      {file.status === 'failed' && <TaskLoggerButton onClick={() => downloadItem(file)} Icon={RestartIcon} />}
      {file.status === 'uploading' && (
        <CircleNotch size={16} className="mr-2 animate-spin text-gray-60" weight="bold" />
      )}
      {file.status === 'success' && <TaskLoggerButton onClick={() => downloadItem(file)} Icon={Success} />}
    </div>
  );
};

export default TaskToRetyItem;
