import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import storageThunks from '../../../store/slices/storage/storage.thunks';
import { DriveItemData } from '../../types';

import { getAppConfig } from 'app/core/services/config.service';
import localStorageService from 'app/core/services/local-storage.service';
import { ListItemMenu } from 'app/shared/components/List/ListItem';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { OrderDirection } from '../../../core/types';
import { AdvancedSharedItem, PreviewFileItem, UserRoles } from '../../../share/types';
import { RootState } from '../../../store';
import { uiActions } from '../../../store/slices/ui';
import workspacesSelectors from '../../../store/slices/workspaces/workspaces.selectors';
import useDriveItemActions from '../DriveExplorer/DriveExplorerItem/hooks/useDriveItemActions';
import FileViewer from './FileViewer';
import { topDropdownBarActionsMenu, useFileViewerKeyboardShortcuts } from './utils/fileViewerWrapperUtils';
import { handleFileThumbnail } from './utils/handleThumbnails';
import { useFileViewerDownload } from './hooks/useFileViewerDownload';

export type TopBarActionsMenu = ListItemMenu<DriveItemData> | ListItemMenu<AdvancedSharedItem> | undefined;

type pathProps = 'drive' | 'trash' | 'shared' | 'recents';

interface FileViewerWrapperProps {
  file: PreviewFileItem;
  onClose: () => void;
  showPreview: boolean;
  onShowStopSharingDialog?: () => void;
  sharedKeyboardShortcuts?: {
    removeItemFromKeyboard?: (item: DriveItemData) => void;
    renameItemFromKeyboard?: (item: DriveItemData) => void;
  };
}

const FileViewerWrapper = ({
  file,
  onClose,
  showPreview,
  onShowStopSharingDialog,
  sharedKeyboardShortcuts,
}: FileViewerWrapperProps): JSX.Element => {
  const dispatch = useAppDispatch();
  const isWorkspace = !!useAppSelector(workspacesSelectors.getSelectedWorkspace);
  const dirtyName = useAppSelector((state: RootState) => state.ui.currentEditingNameDirty);
  const isAuthenticated = useAppSelector((state) => state.user.isAuthenticated);
  const currentUserRole = useAppSelector((state: RootState) => state.shared.currentSharingRole);

  const [currentFile, setCurrentFile] = useState<PreviewFileItem>(file);

  const user = localStorageService.getUser();

  const path = getAppConfig().views.find((view) => view.path === location.pathname);
  const pathId = path?.id as pathProps;
  const isSharedView = pathId === 'shared';

  const driveItemActions = useDriveItemActions(currentFile);

  const onDownloadFile = () =>
    currentFile && dispatch(storageThunks.downloadItemsThunk([currentFile as DriveItemData]));

  const { blob, updateProgress, handleProgress, abortDownload, setBlob } = useFileViewerDownload({
    currentFile,
    isWorkspace,
    dispatch,
  });

  useEffect(() => {
    setBlob(null);
    if (dirtyName && dirtyName !== '') {
      setCurrentFile?.({
        ...currentFile,
        plainName: dirtyName,
      });
    }
    dispatch(uiActions.setCurrentEditingNameDirty(''));
  }, [dirtyName, currentFile]);

  const isCurrentUserViewer = useCallback(() => {
    return currentUserRole === UserRoles.Reader;
  }, [currentUserRole]);

  const topActionsMenu = topDropdownBarActionsMenu({
    currentFile,
    user,
    onClose,
    onShowStopSharingDialog,
    driveItemActions,
    isCurrentUserViewer,
  });

  const { removeItemFromKeyboard, renameItemFromKeyboard } = useFileViewerKeyboardShortcuts({
    sharedKeyboardShortcuts,
    driveItemActions,
    onClose,
  });

  const driveItemsOrder = useAppSelector((state) => state.storage.driveItemsOrder);
  const driveItemsSort = useAppSelector((state) => state.storage.driveItemsSort);

  // Get all files in the current folder, sort the files and find the current file to display the file
  const currentItemsFolder = useAppSelector((state) => state.storage.levels[file?.folderUuid || '']);
  const folderFiles = useMemo(() => currentItemsFolder?.filter((item) => !item.isFolder), [currentItemsFolder]);

  const sortFolderFiles = useMemo(() => {
    if (folderFiles) {
      return folderFiles.sort((a, b) => {
        if (driveItemsOrder === OrderDirection.Asc) {
          return a[driveItemsSort] > b[driveItemsSort] ? 1 : -1;
        } else if (driveItemsOrder === OrderDirection.Desc) {
          return a[driveItemsSort] < b[driveItemsSort] ? 1 : -1;
        }
        return 0;
      });
    }
    return [];
  }, [folderFiles]);
  const fileIndex = sortFolderFiles?.findIndex((item) => item.id === currentFile?.id);
  const totalFolderIndex = sortFolderFiles?.length;

  //Switch to the next or previous file in the folder
  function changeFile(direction: 'next' | 'prev') {
    abortDownload();
    if (direction === 'next') {
      setCurrentFile(sortFolderFiles[fileIndex + 1]);
    } else {
      setCurrentFile(sortFolderFiles[fileIndex - 1]);
    }
  }

  const handlersForSpecialItems = {
    handleUpdateProgress: handleProgress,
    handleUpdateThumbnail: handleFileThumbnail,
  };

  return showPreview ? (
    <FileViewer
      show={showPreview}
      file={currentFile}
      onClose={() => {
        onClose();
        abortDownload();
      }}
      onDownload={onDownloadFile}
      progress={updateProgress}
      isAuthenticated={isAuthenticated}
      blob={blob}
      fileIndex={fileIndex}
      totalFolderIndex={totalFolderIndex}
      changeFile={changeFile}
      dropdownItems={topActionsMenu}
      isShareView={isSharedView}
      keyboardShortcuts={{
        removeItemFromKeyboard,
        renameItemFromKeyboard,
      }}
      handlersForSpecialItems={handlersForSpecialItems}
    />
  ) : (
    <div className="hidden" />
  );
};

export default FileViewerWrapper;
