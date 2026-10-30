import { DialogTitle } from '@headlessui/react';
import UilMultiply from '@iconscout/react-unicons/icons/uil-multiply';
import { MenuItemType } from '@internxt/ui';
import iconService from 'app/drive/services/icon.service';
import { DriveFileData, DriveItemData } from 'app/drive/types';
import { TopBarActionsMenu } from '../types';
import { getFileDisplayName } from '../utils/fileViewerUtils';
import TopBarActions from './TopBarActions';

interface FileViewerTopBarProps {
  file: DriveFileData;
  isAuthenticated: boolean;
  isShareView?: boolean;
  dropdownItems?: TopBarActionsMenu;
  onClose: () => void;
  onDownload: () => void;
}

const FileViewerTopBar = ({
  file,
  isAuthenticated,
  isShareView,
  dropdownItems,
  onClose,
  onDownload,
}: FileViewerTopBarProps): JSX.Element => {
  const ItemIconComponent = iconService.getItemIcon(false, file.type);
  const filename = getFileDisplayName(file);

  return (
    <>
      <div className="pointer-events-none fixed -inset-x-20 -top-6 z-10 h-16 bg-black blur-2xl" />

      <div className="fixed inset-x-0 top-0 z-20 flex h-0 w-screen max-w-full select-none flex-row items-start justify-between px-4 text-lg">
        <div className="mr-6 mt-3 flex h-10 flex-row items-center justify-start space-x-4 truncate md:mr-32">
          <button
            onClick={onClose}
            className="group relative flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-full bg-white/0 transition duration-50 ease-in-out hover:bg-white/10 focus:bg-white/5"
          >
            <UilMultiply height={24} width={24} />
          </button>

          <DialogTitle className="flex w-11/12 flex-row items-center text-lg">
            <div className="mr-3 flex h-8 w-8 items-center">
              <ItemIconComponent width={32} height={32} />
            </div>
            <p className="w-full truncate" title={filename}>
              {filename}
            </p>
          </DialogTitle>
        </div>

        <TopBarActions
          onDownload={onDownload}
          file={file as DriveItemData}
          isAuthenticated={isAuthenticated}
          isShareView={isShareView}
          dropdownItems={dropdownItems as Array<MenuItemType<DriveItemData>>}
        />
      </div>
    </>
  );
};

export default FileViewerTopBar;
