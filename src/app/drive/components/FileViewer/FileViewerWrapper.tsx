import { useAppDispatch, useAppSelector } from 'app/store/hooks';
import { DriveItemData } from 'app/drive/types';
import { useEffect } from 'react';
import { PreviewFileItem } from 'app/share/types';
import { RootState } from 'app/store';
import { uiActions } from 'app/store/slices/ui';
import workspacesSelectors from 'app/store/slices/workspaces/workspaces.selectors';
import FileViewer from './FileViewer';
import { useFilePreviewContent } from './hooks/useFilePreviewContent';
import { useFileThumbnailRefresh } from './hooks/useFileThumbnailRefresh';
import { useFileViewerNavigation } from './hooks/useFileViewerNavigation';
import { useFileViewerActions } from './hooks/useFileViewerActions';
import { FileViewerKeyboardShortcuts } from './types';
import { MenuItemType } from '@internxt/ui';
import { DownloadManager } from 'app/network/DownloadManager';
import { convertibleImageExtensions } from 'app/drive/types/file-types';

interface FileViewerWrapperProps {
  file: PreviewFileItem;
  showPreview: boolean;
  onClose: () => void;
  folderItems?: DriveItemData[];
  contextMenu?: Array<MenuItemType<DriveItemData>>;
  isSharedView?: boolean;
  keyboardShortcuts?: FileViewerKeyboardShortcuts;
}

const FileViewerWrapper = ({
  file,
  onClose,
  showPreview,
  folderItems,
  contextMenu,
  isSharedView,
  keyboardShortcuts,
}: FileViewerWrapperProps): JSX.Element => {
  const dispatch = useAppDispatch();
  const selectedWorkspace = useAppSelector(workspacesSelectors.getSelectedWorkspace);
  const workspaceCredentials = useAppSelector(workspacesSelectors.getWorkspaceCredentials);
  const isWorkspace = !!selectedWorkspace;
  const dirtyName = useAppSelector((state: RootState) => state.ui.currentEditingNameDirty);
  const isAuthenticated = useAppSelector((state) => state.user.isAuthenticated);

  const { currentFile, setCurrentFile, navigation } = useFileViewerNavigation({ initialFile: file, folderItems });

  const { menuItems, keyboardShortcuts: viewerKeyboardShortcuts } = useFileViewerActions({
    file: currentFile,
    onClose,
    contextMenu,
    keyboardShortcuts,
  });

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
      dropdownItems={menuItems}
      isShareView={isSharedView}
      keyboardShortcuts={viewerKeyboardShortcuts}
      onProgress={updateProgress}
      onConvertedContent={refreshThumbnail}
    />
  ) : (
    <div className="hidden" />
  );
};

export default FileViewerWrapper;
