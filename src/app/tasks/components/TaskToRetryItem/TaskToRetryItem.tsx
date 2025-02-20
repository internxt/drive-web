import { ListChildComponentProps } from 'react-window';
import { ReactComponent as RestartIcon } from '../../../../assets/icons/tasklogger/circle-arrow.svg';
import iconService from 'app/drive/services/icon.service';
import { UploadManagerFileParams } from 'app/network/UploadManager';
import { bytesToString } from 'app/drive/services/size.service';
import { formatDefaultDate } from 'app/core/services/date.service';
import { t } from 'i18next';

const TaskToRetyItem = ({ index, style, data }: ListChildComponentProps) => {
  const file: UploadManagerFileParams = data.files[index];
  const { onRetry } = data;
  const getFileIcon = (type: string) => {
    const IconComponent = iconService.getItemIcon(false, type);
    return <IconComponent className="w-10 h-10 text-gray-600" />;
  };

  return (
    <div style={style} className="flex items-center justify-between px-4 py-3 border-b border-gray-5">
      <div className="flex items-center gap-4">
        {getFileIcon(file.filecontent.type)}
        <div>
          <p className="text-base font-medium text-gray-100 truncate max-w-xs">{file.filecontent.name}</p>
          <p className="text-sm font-regular text-gray-50">
            {bytesToString(file.filecontent.size)} - {formatDefaultDate(file.filecontent.content.lastModified, t)}
          </p>
        </div>
      </div>
      <button onClick={() => onRetry(file)} className="p-2 rounded-lg hover:bg-gray-100 transition">
        <RestartIcon height={20} width={20} className="text-gray-100" />
      </button>
    </div>
  );
};

export default TaskToRetyItem;
