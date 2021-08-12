import { FileActionTypes, FileStatusTypes } from '../../../models/enums';
import { NotificationData } from '../../../models/interfaces';
import iconService from '../../../services/icon.service';
import { getItemFullName } from '../../../services/storage.service/storage-name.service';

interface ItemProps {
  item: NotificationData
}

const FileLoggerItem = ({ item }: ItemProps): JSX.Element => {
  const IconComponent = iconService.getItemIcon(item.isFolder, item.type || '');
  const fileMessagesByStatus = {
    [FileStatusTypes.Pending]: item.action === FileActionTypes.Download ? 'Pending to download' : 'Pending to upload',
    [FileStatusTypes.Uploading]: (item.progress || 0) *100 + '% Uploading file...',
    [FileStatusTypes.Downloading]: (item.progress || 0)*100 + '% Downloading file...',
    [FileStatusTypes.Success]: item.action === FileActionTypes.Download ? 'File downloaded' : 'File uploaded',
    [FileStatusTypes.Error]: item.action === FileActionTypes.Download ? 'Error during download' : 'Error during upload',
    [FileStatusTypes.Encrypting]: 'Encrypting file',
    [FileStatusTypes.Decrypting]: 'Decrypting file'
  };
  const folderMessagesByStatus = {
    [FileStatusTypes.Pending]: item.action === FileActionTypes.Download ? 'Pending to download folder' : 'Pending to upload folder',
    [FileStatusTypes.Uploading]: 'Uploading...',
    [FileStatusTypes.Downloading]: 'Downloading files in folder...',
    [FileStatusTypes.Success]: item.action === FileActionTypes.Download ? 'Folder downloaded' : 'Folder uploaded',
    [FileStatusTypes.Error]: item.action === FileActionTypes.Download ? 'Error during download' : 'Error during upload',
    [FileStatusTypes.Encrypting]: 'Encrypting files',
    [FileStatusTypes.Decrypting]: 'Decrypting files'
  };
  const fullName = getItemFullName(item.name, item.type);
  const icon: JSX.Element = <IconComponent className='flex items-center justify-center mr-2.5 w-6' />;
  const statusClassName = [FileStatusTypes.Success, FileStatusTypes.Error].includes(item.status) ? '' : 'opacity-50';
  const message: string = item.isFolder ?
    folderMessagesByStatus[item.status] :
    fileMessagesByStatus[item.status];
  const messageClassName = item.status === FileStatusTypes.Error ? 'text-red-50' : 'text-neutral-500';

  return (
    <div className={`${statusClassName} flex items-center px-4`}>
      {icon}

      <div className='flex flex-col text-left w-40'>
        <span className='text-sm text-neutral-900 truncate'>
          {fullName}
        </span>

        <span className={`text-xs ${messageClassName}`}>
          {message}
        </span>
      </div>
    </div>
  );
};

export default FileLoggerItem;