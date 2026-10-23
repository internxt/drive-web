import { useAppDispatch, useAppSelector } from 'app/store/hooks';
import { DriveFileData, DriveItemData } from 'app/drive/types';
import { Thumbnail } from '@internxt/sdk/dist/drive/storage/types';
import { useCallback, useEffect, useMemo, useState } from 'react';
import errorService from 'services/error.service';
import { OrderDirection } from 'app/core/types';
import {
  ThumbnailToUpload,
  compareThumbnail,
  getThumbnailFrom,
  setCurrentThumbnail,
  setThumbnails,
  uploadThumbnail,
} from 'app/drive/services/thumbnail.service';
import { PreviewFileItem, UserRoles } from 'app/share/types';
import { RootState } from 'app/store';
import { uiActions } from 'app/store/slices/ui';
import workspacesSelectors from 'app/store/slices/workspaces/workspaces.selectors';
import { getDatabaseFilePreviewData, updateDatabaseFilePreviewData } from 'app/drive/services/database.service';
import { useDriveItemActions } from 'views/Drive/hooks';
import FileViewer from './FileViewer';
import { topDropdownBarActionsMenu, useFileViewerKeyboardShortcuts } from './utils/fileViewerWrapperUtils';
import { useFilePreviewContent } from './hooks/useFilePreviewContent';
import { FileToUpload } from 'app/drive/services/file.service/types';
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

  const [currentFile, setCurrentFile] = useState<PreviewFileItem>(file);

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

  const { blob, progress, hasFailed, updateProgress } = useFilePreviewContent({
    file: currentFile,
    isEnabled: showPreview,
    isWorkspace,
    onFreshDownload: (downloadedFile, downloadedBlob) => {
      const isConvertibleImage = convertibleImageExtensions.includes(downloadedFile.type.toLowerCase());
      if (!isConvertibleImage) {
        handleFileThumbnail(downloadedFile, downloadedBlob).catch(errorService.reportError);
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

  const folderItemsFiltered = folderItems?.filter((item) => !item.isFolder || item.type !== 'folder');
  const currentFolder = folderItemsFiltered ?? sortFolderFiles;
  const fileIndex = currentFolder?.findIndex((item) => item.id === currentFile?.id);
  const totalFolderIndex = currentFolder?.length;

  //Switch to the next or previous file in the folder
  function changeFile(direction: 'next' | 'prev') {
    if (direction === 'next') {
      setCurrentFile?.(currentFolder[fileIndex + 1]);
    } else {
      setCurrentFile?.(currentFolder[fileIndex - 1]);
    }
  }

  const handleUpdateLocalImageThumbnail = async (
    thumbnailFile: File,
    driveFile: DriveFileData,
    currentThumbnail: Thumbnail | null,
    thumbnailUploaded?: Thumbnail,
  ) => {
    const isThumbnailGeneratedAndUploaded = thumbnailUploaded && thumbnailFile;

    if (isThumbnailGeneratedAndUploaded) {
      setCurrentThumbnail(thumbnailFile, thumbnailUploaded, driveFile as DriveItemData, dispatch);

      let newThumbnails: Thumbnail[];

      const existLocalThumbnail = !!currentThumbnail;
      if (existLocalThumbnail) {
        //Replace existing thumbnail with the new uploadedThumbnail
        newThumbnails = driveFile.thumbnails?.length > 0 ? [...driveFile.thumbnails] : [thumbnailUploaded];
        newThumbnails.splice(newThumbnails.indexOf(currentThumbnail), 1, thumbnailUploaded);
      } else {
        newThumbnails =
          driveFile.thumbnails?.length > 0 ? [...driveFile.thumbnails, ...[thumbnailUploaded]] : [thumbnailUploaded];
      }

      setThumbnails(newThumbnails, driveFile as DriveItemData, dispatch);
      await updateDatabaseFilePreviewData({
        fileId: driveFile.id,
        folderId: driveFile.folderId,
        previewBlob: thumbnailFile,
        updatedAt: driveFile.updatedAt,
      });
    }
  };

  const handleFileThumbnail = async (driveFile: PreviewFileItem, file: File | Blob) => {
    const currentThumbnail = driveFile.thumbnails && driveFile.thumbnails.length > 0 ? driveFile.thumbnails[0] : null;
    const databaseThumbnail = await getDatabaseFilePreviewData({ fileId: driveFile.id });
    const existsThumbnailInDatabase = !!databaseThumbnail;

    const isImageBlob = file.type?.startsWith('image/');
    const fileType = isImageBlob ? file.type.split('/')[1] : driveFile.type;

    const fileObject = new File([file], driveFile.name, { type: file.type });

    const fileUpload: FileToUpload = {
      name: driveFile.name,
      size: driveFile.size,
      type: fileType,
      content: fileObject,
      parentFolderId: driveFile.folderUuid,
    };

    const thumbnailGenerated = await getThumbnailFrom(fileUpload);

    const isDifferentThumbnailOrNotExists =
      !currentThumbnail || !compareThumbnail(currentThumbnail, thumbnailGenerated);

    if (isDifferentThumbnailOrNotExists && thumbnailGenerated.file) {
      const thumbnailToUpload: ThumbnailToUpload = {
        fileId: driveFile.uuid,
        size: thumbnailGenerated.file.size,
        max_width: thumbnailGenerated.max_width,
        max_height: thumbnailGenerated.max_height,
        type: thumbnailGenerated.type,
        content: thumbnailGenerated.file,
      };

      const thumbnailUploaded = await uploadThumbnail(thumbnailToUpload, isWorkspace, () => {});

      setCurrentThumbnail(thumbnailGenerated.file, thumbnailUploaded, driveFile as DriveItemData, dispatch);

      await handleUpdateLocalImageThumbnail(thumbnailGenerated.file, driveFile, currentThumbnail, thumbnailUploaded);
    } else if (!existsThumbnailInDatabase && thumbnailGenerated?.file) {
      await updateDatabaseFilePreviewData({
        fileId: driveFile.id,
        folderId: driveFile.folderId,
        previewBlob: new Blob([thumbnailGenerated?.file], { type: thumbnailGenerated.file?.type }),
        updatedAt: driveFile.updatedAt,
      });
    }
  };

  const handlersForSpecialItems = {
    handleUpdateProgress: updateProgress,
    handleUpdateThumbnail: handleFileThumbnail,
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
