import { useAppDispatch, useAppSelector } from 'app/store/hooks';
import { DriveItemData } from 'app/drive/types';
import { useCallback, useEffect, useState } from 'react';
import { PreviewFileItem, UserRoles } from 'app/share/types';
import { RootState } from 'app/store';
import { uiActions } from 'app/store/slices/ui';
import workspacesSelectors from 'app/store/slices/workspaces/workspaces.selectors';
import { useDriveItemActions } from 'views/Drive/hooks';
import FileViewer from './FileViewer';
import { topDropdownBarActionsMenu, useFileViewerKeyboardShortcuts } from './utils/fileViewerWrapperUtils';
import { useFilePreviewContent } from './hooks/useFilePreviewContent';
import { useFileThumbnailRefresh } from './hooks/useFileThumbnailRefresh';
import { useFileViewerNavigation } from './hooks/useFileViewerNavigation';
import { MenuItemType } from '@internxt/ui';
import { DownloadManager } from 'app/network/DownloadManager';
import { convertibleImageExtensions } from 'app/drive/types/file-types';
import encryptedStorageService from 'services/encrypted-storage.service';
import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';

interface FileViewerWrapperProps {
  file: PreviewFileItem;
  showPreview: boolean;
  onClose: () => void;
  folderItems?: DriveItemData[];
  contextMenu?: Array<MenuItemType<DriveItemData>>;
  isSharedView?: boolean;
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
  folderItems,
  contextMenu,
  isSharedView,
  onShowStopSharingDialog,
  sharedKeyboardShortcuts,
}: FileViewerWrapperProps): JSX.Element => {
  const dispatch = useAppDispatch();
  const selectedWorkspace = useAppSelector(workspacesSelectors.getSelectedWorkspace);
  const workspaceCredentials = useAppSelector(workspacesSelectors.getWorkspaceCredentials);
  const isWorkspace = !!selectedWorkspace;
  const dirtyName = useAppSelector((state: RootState) => state.ui.currentEditingNameDirty);
  const isAuthenticated = useAppSelector((state) => state.user.isAuthenticated);
  const currentUserRole = useAppSelector((state: RootState) => state.shared.currentSharingRole);

  const { currentFile, setCurrentFile, navigation } = useFileViewerNavigation({ initialFile: file, folderItems });

  const [user, setUser] = useState<UserSettings | null>(null);

  useEffect(() => {
    encryptedStorageService.getUser().then(setUser);
  }, []);

  const driveItemActions = useDriveItemActions(currentFile);

  const onDownload = () => {
    if (currentFile) {
      DownloadManager.downloadItem({
        payload: [currentFile as DriveItemData],
        selectedWorkspace,
        workspaceCredentials,
      });
    }
  };

  const { refreshThumbnail } = useFileThumbnailRefresh({ isSharedView, isWorkspace });

  const { blob, progress, hasFailed, updateProgress } = useFilePreviewContent({
    file: currentFile,
    isEnabled: showPreview,
    isWorkspace,
    onFreshDownload: (downloadedFile, downloadedBlob) => {
      const isConvertibleImage = convertibleImageExtensions.includes(downloadedFile.type.toLowerCase());
      if (!isConvertibleImage) {
        void refreshThumbnail(downloadedFile, downloadedBlob);
      }
    },
  });

  useEffect(() => {
    dispatch(uiActions.setFileViewerItem(currentFile));
  }, [currentFile]);

  useEffect(() => {
    if (dirtyName && dirtyName !== '') {
      setCurrentFile?.({
        ...currentFile,
        plainName: dirtyName,
        name: dirtyName,
      });
    }
    dispatch(uiActions.setCurrentEditingNameDirty(''));
  }, [dirtyName, currentFile]);

  const isCurrentUserViewer = useCallback(() => {
    return currentUserRole === UserRoles.Reader;
  }, [currentUserRole]);

  const topActionsMenu =
    contextMenu ??
    topDropdownBarActionsMenu({
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

  const handlersForSpecialItems = {
    handleUpdateProgress: updateProgress,
    handleUpdateThumbnail: refreshThumbnail,
  };

  return showPreview && currentFile ? (
    <FileViewer
      show={showPreview}
      file={currentFile}
      onClose={onClose}
      onDownload={onDownload}
      progress={progress}
      isAuthenticated={isAuthenticated}
      blob={blob}
      hasPreviewFailed={hasFailed}
      navigation={navigation}
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
