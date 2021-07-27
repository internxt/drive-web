import { ILoggerFile } from '../../models/interfaces';
import { getIcon, IconType } from '../../services/icon.service';

interface ItemProps {
  item: ILoggerFile
}

const Item = ({ item }: ItemProps): JSX.Element => {
  const getFileInfo = (): { icon: string, status: string, name: string } => {
    const name = item.filePath.substr(item.filePath.lastIndexOf('/') + 1);
    const infoObj = { icon: '', status: '', name: name };

    switch (item.status) {
      case 'uploading':
        infoObj.icon = item.isFolder ? getIcon(IconType.folderBlue) : getIcon(IconType.clockGray);
        infoObj.status = item.isFolder ? 'Uploading...' : item.progress + '% Uploading file...';

        return infoObj;

      case 'downloading':
        infoObj.icon = item.isFolder ? getIcon(IconType.folderBlue) : getIcon(IconType.clockGray);
        infoObj.status = item.isFolder ? 'Downloading files in folder...' : item.progress + '% Downloading file...';

        return infoObj;

      case 'success':
        infoObj.icon = item.isFolder ? getIcon(IconType.folderBlue) : getIcon(IconType.fileSuccessGreen);
        infoObj.status = item.action === 'download' ? 'File downloaded' : 'File uploaded';

        return infoObj;

      case 'error':
        infoObj.icon = item.isFolder ? getIcon(IconType.folderBlue) : getIcon(IconType.fileErrorRed);
        infoObj.status = item.action === 'download' ? 'Error during download' : 'Error during upload';

        return infoObj;

      case 'encrypting':
        infoObj.icon = item.isFolder ? getIcon(IconType.folderBlue) : getIcon(IconType.fileEncryptingGray);
        infoObj.status = item.isFolder ? 'Encrypting files' : 'Encrypting file';

        return infoObj;

      case 'decrypting':
        infoObj.icon = item.isFolder ? getIcon(IconType.folderBlue) : getIcon(IconType.fileEncryptingGray);
        infoObj.status = item.isFolder ? 'Decrypting files' : 'Decrypting file';

        return infoObj;

      case 'creating-directory-structure':
        infoObj.icon = getIcon(IconType.clockGray);
        infoObj.status = 'Creating directory structure';

        return infoObj;

      default: // Pending
        infoObj.icon = item.isFolder ? getIcon(IconType.folderBlue) : getIcon(IconType.clockGray);
        infoObj.status = item.action === 'download' ? 'Pending to download' : 'Pending to upload';

        return infoObj;
    }
  };

  return (
    <div className='flex items-center px-4 mb-2.5'>
      <div className='flex items-center justify-center mr-2.5 w-4'>
        <img src={getFileInfo().icon} alt="" />
      </div>

      <div className='flex flex-col text-left w-40'>
        <span className='text-xs text-neutral-900 truncate'>
          {getFileInfo().name}
        </span>

        <span className='text-supporting-2 text-neutral-500'>
          {getFileInfo().status}
        </span>
      </div>
    </div>
  );
};

export default Item;
