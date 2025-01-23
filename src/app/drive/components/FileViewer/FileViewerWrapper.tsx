import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import storageThunks from '../../../store/slices/storage/storage.thunks';
import { DriveFileData, DriveItemData } from '../../types';
import { Thumbnail } from '@internxt/sdk/dist/drive/storage/types';
import { getAppConfig } from 'app/core/services/config.service';
import localStorageService from 'app/core/services/local-storage.service';
import { useCallback, useEffect, useMemo, useState } from 'react';
import errorService from '../../../core/services/error.service';
import { OrderDirection } from '../../../core/types';
import {
  ThumbnailToUpload,
  compareThumbnail,
  getThumbnailFrom,
  setCurrentThumbnail,
  setThumbnails,
  uploadThumbnail,
} from '../../../drive/services/thumbnail.service';
import { AdvancedSharedItem, PreviewFileItem, UserRoles } from '../../../share/types';
import { RootState } from '../../../store';
import { uiActions } from '../../../store/slices/ui';
import workspacesSelectors from '../../../store/slices/workspaces/workspaces.selectors';
import { getDatabaseFilePreviewData, updateDatabaseFilePreviewData } from '../../services/database.service';
import downloadService from '../../services/download.service';
import useDriveItemActions from '../DriveExplorer/DriveExplorerItem/hooks/useDriveItemActions';
import FileViewer from './FileViewer';
import {
  getFileContentManager,
  topDropdownBarActionsMenu,
  useFileViewerKeyboardShortcuts,
} from './utils/fileViewerWrapperUtils';
import { FileToUpload } from '../../../drive/services/file.service/types';
import { MenuItemType } from '@internxt/ui';

export type TopBarActionsMenu =
  | Array<MenuItemType<DriveItemData>>
  | Array<MenuItemType<AdvancedSharedItem>>
  | undefined;

type pathProps = 'drive' | 'trash' | 'shared' | 'recents';

const SPECIAL_MIME_TYPES = ['heic'];

interface FileViewerWrapperProps {
  file: PreviewFileItem;
  showPreview: boolean;
  onClose: () => void;
  folderItems?: DriveItemData[];
  contextMenu?: Array<MenuItemType<DriveItemData>>;
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
  onShowStopSharingDialog,
  sharedKeyboardShortcuts,
}: FileViewerWrapperProps): JSX.Element => {
  const dispatch = useAppDispatch();
  const isWorkspace = !!useAppSelector(workspacesSelectors.getSelectedWorkspace);
  const dirtyName = useAppSelector((state: RootState) => state.ui.currentEditingNameDirty);
  const isAuthenticated = useAppSelector((state) => state.user.isAuthenticated);
  const currentUserRole = useAppSelector((state: RootState) => state.shared.currentSharingRole);

  const [isDownloadStarted, setIsDownloadStarted] = useState(false);
  const [updateProgress, setUpdateProgress] = useState(0);
  const [currentFile, setCurrentFile] = useState<PreviewFileItem>(file);

  const [blob, setBlob] = useState<Blob | null>(null);

  const user = localStorageService.getUser();
  const userEmail = user?.email;

  const path = getAppConfig().views.find((view) => view.path === location.pathname);
  const pathId = path?.id as pathProps;
  const isSharedView = pathId === 'shared';

  const driveItemActions = useDriveItemActions(currentFile);

  const onDownload = () => currentFile && dispatch(storageThunks.downloadItemsThunk([currentFile as DriveItemData]));

  useEffect(() => {
    if (currentFile?.plainName === currentFile.name) {
      setBlob(null);
      dispatch(uiActions.setFileViewerItem(currentFile));
      if (currentFile && !updateProgress && !isDownloadStarted) {
        setIsDownloadStarted(true);
        fileContentManager
          .download()
          .then((downloadedFile) => {
            setBlob(downloadedFile.blob);
            setUpdateProgress(0);
            setIsDownloadStarted(false);
            if (downloadedFile.shouldHandleFileThumbnail) {
              handleFileThumbnail(currentFile, downloadedFile.blob).catch(errorService.reportError);
            }
          })
          .catch((error) => {
            if (error.name === 'AbortError') {
              return;
            }
            console.error(error);
            setBlob(null);
            errorService.reportError(error);
            setIsDownloadStarted(false);
          });
      }
    }
  }, [showPreview, currentFile]);

  useEffect(() => {
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
    setBlob(null);
    setIsDownloadStarted(false);
    setUpdateProgress(0);
    if (direction === 'next') {
      setCurrentFile?.(currentFolder[fileIndex + 1]);
    } else {
      setCurrentFile?.(currentFolder[fileIndex - 1]);
    }
  }

  function handleProgress(progress: number, fileType?: string) {
    if (fileType && SPECIAL_MIME_TYPES.includes(fileType)) {
      setUpdateProgress(progress * 0.95);
    } else {
      setUpdateProgress(progress);
    }
  }

  function downloadFile(currentFile: PreviewFileItem, abortController: AbortController) {
    setBlob(null);
    return downloadService.fetchFileBlob(
      { ...currentFile, bucketId: currentFile.bucket },
      {
        updateProgressCallback: (progress) => handleProgress(progress, currentFile.type.toLowerCase()),
        isWorkspace,
        abortController,
      },
      currentFile.credentials,
      currentFile.mnemonic,
    );
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

    const fileObject = new File([file], driveFile.name);

    const fileUpload: FileToUpload = {
      name: driveFile.name,
      size: driveFile.size,
      type: driveFile.type,
      content: fileObject,
      parentFolderId: driveFile.folderUuid,
    };

    const thumbnailGenerated = await getThumbnailFrom(fileUpload);

    const isDifferentThumbnailOrNotExists =
      !currentThumbnail || !compareThumbnail(currentThumbnail, thumbnailGenerated);

    if (isDifferentThumbnailOrNotExists && thumbnailGenerated.file) {
      const thumbnailToUpload: ThumbnailToUpload = {
        fileId: driveFile.id,
        size: thumbnailGenerated.file.size,
        max_width: thumbnailGenerated.max_width,
        max_height: thumbnailGenerated.max_height,
        type: thumbnailGenerated.type,
        content: thumbnailGenerated.file,
      };

      const thumbnailUploaded = await uploadThumbnail(userEmail as string, thumbnailToUpload, false, () => {});

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

  const fileContentManager = getFileContentManager(currentFile, downloadFile);

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
        fileContentManager.abort();
      }}
      onDownload={onDownload}
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
