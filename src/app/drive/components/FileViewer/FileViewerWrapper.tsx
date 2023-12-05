import storageThunks from '../../../store/slices/storage/storage.thunks';
import { DriveFileData, DriveItemData } from '../../types';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';

import FileViewer from './FileViewer';
import { sessionSelectors } from '../../../store/slices/session/session.selectors';
import downloadService from '../../services/download.service';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  getDatabaseFileSourceData,
  getDatabaseFilePreviewData,
  updateDatabaseFilePreviewData,
  canFileBeCached,
  updateDatabaseFileSourceData,
} from '../../services/database.service';
import dateService from '../../../core/services/date.service';
import {
  compareThumbnail,
  getThumbnailFrom,
  setCurrentThumbnail,
  setThumbnails,
  ThumbnailToUpload,
} from '../../../drive/services/thumbnail.service';
import { Thumbnail } from '@internxt/sdk/dist/drive/storage/types';
import { FileToUpload } from '../../../drive/services/file.service/uploadFile';
import { AdvancedSharedItem, PreviewFileItem, UserRoles } from '../../../share/types';
import errorService from '../../../core/services/error.service';
import { OrderDirection } from '../../../core/types';
import { uiActions } from '../../../store/slices/ui';
import { RootState } from '../../../store';
import localStorageService from 'app/core/services/local-storage.service';
import {
  contextMenuDriveItemShared,
  contextMenuDriveItemSharedAFS,
  contextMenuDriveNotSharedLink,
  contextMenuTrashItems,
} from '../DriveExplorer/DriveExplorerList/DriveItemContextMenu';
import { ListItemMenu } from 'app/shared/components/List/ListItem';
import { getAppConfig } from 'app/core/services/config.service';
import useDriveItemActions from '../DriveExplorer/DriveExplorerItem/hooks/useDriveItemActions';

export type TopBarActionsMenu = ListItemMenu<DriveItemData> | ListItemMenu<AdvancedSharedItem> | undefined;

type pathProps = 'drive' | 'trash' | 'shared' | 'recents';

interface FileViewerWrapperProps {
  file: PreviewFileItem;
  onClose: () => void;
  showPreview: boolean;
  onStopSharing?: () => void;
}

const FileViewerWrapper = ({ file, onClose, showPreview, onStopSharing }: FileViewerWrapperProps): JSX.Element => {
  const isTeam = useAppSelector(sessionSelectors.isTeam);
  const isAuthenticated = useAppSelector((state) => state.user.isAuthenticated);
  const dispatch = useAppDispatch();
  const onDownload = () => currentFile && dispatch(storageThunks.downloadItemsThunk([currentFile as DriveItemData]));
  const currentUserRole = useAppSelector((state: RootState) => state.shared.currentSharingRole);

  const [updateProgress, setUpdateProgress] = useState(0);
  const [currentFile, setCurrentFile] = useState<PreviewFileItem>(file);
  const dirtyName = useAppSelector((state: RootState) => state.ui.currentEditingNameDirty);
  const [blob, setBlob] = useState<Blob | null>(null);
  const user = localStorageService.getUser();

  const path = getAppConfig().views.find((view) => view.path === location.pathname);
  const pathId = path?.id as pathProps;
  const isRecentsView = pathId === 'recents';
  const isSharedView = pathId === 'shared';
  const isTrashView = pathId === 'trash';

  const isSharedItem = file.sharings && file.sharings?.length > 0;
  const isOwner = file.credentials?.user === user?.email;

  const {
    onDownloadItemButtonClicked,
    onMoveItemButtonClicked,
    onCopyLinkButtonClicked,
    onShowDetailsButtonClicked,
    onLinkSettingsButtonClicked,
    onMoveToTrashButtonClicked,
    onRenameItemButtonClicked,
    onRestoreItemButtonClicked,
    onDeletePermanentlyButtonClicked,
  } = useDriveItemActions(currentFile);

  const isCurrentUserViewer = useCallback(() => {
    return currentUserRole === UserRoles.Reader;
  }, [currentUserRole]);

  const driveActionsMenu = (): ListItemMenu<DriveItemData> => {
    if (isSharedItem) {
      return contextMenuDriveItemShared({
        copyLink: onCopyLinkButtonClicked,
        openShareAccessSettings: onLinkSettingsButtonClicked,
        deleteLink: () => ({}),
        showDetails: onShowDetailsButtonClicked,
        renameItem: onRenameItemButtonClicked,
        moveItem: onMoveItemButtonClicked,
        downloadItem: onDownloadItemButtonClicked,
        moveToTrash: () => {
          onMoveToTrashButtonClicked();
          onClose();
        },
      });
    } else {
      return contextMenuDriveNotSharedLink({
        shareLink: onLinkSettingsButtonClicked,
        getLink: onCopyLinkButtonClicked,
        renameItem: onRenameItemButtonClicked,
        showDetails: onShowDetailsButtonClicked,
        moveItem: onMoveItemButtonClicked,
        downloadItem: onDownloadItemButtonClicked,
        moveToTrash: () => {
          onMoveToTrashButtonClicked();
          onClose();
        },
      });
    }
  };

  const recentsActionsMenu = (): ListItemMenu<DriveItemData> => {
    return contextMenuDriveNotSharedLink({
      shareLink: onLinkSettingsButtonClicked,
      getLink: onCopyLinkButtonClicked,
      renameItem: onRenameItemButtonClicked,
      moveItem: onMoveItemButtonClicked,
      showDetails: onShowDetailsButtonClicked,
      downloadItem: onDownloadItemButtonClicked,
      moveToTrash: () => {
        onMoveToTrashButtonClicked();
        onClose();
      },
    });
  };

  const sharedActionsMenu = (): ListItemMenu<AdvancedSharedItem> => {
    return contextMenuDriveItemSharedAFS({
      openShareAccessSettings: isOwner ? onLinkSettingsButtonClicked : undefined,
      copyLink: onCopyLinkButtonClicked,
      deleteLink: () => undefined,
      showDetails: onShowDetailsButtonClicked,
      renameItem: !isCurrentUserViewer() ? onRenameItemButtonClicked : undefined,
      moveItem: isOwner ? onMoveItemButtonClicked : undefined,
      downloadItem: onDownloadItemButtonClicked,
      moveToTrash: () => {
        if (isOwner) {
          onStopSharing?.();
        }
      },
    });
  };

  const trashActionsMenu = (): ListItemMenu<DriveItemData> => {
    return contextMenuTrashItems({
      restoreItem: onRestoreItemButtonClicked,
      deletePermanently: onDeletePermanentlyButtonClicked,
    });
  };

  const topDropdownBarActionsMenu = (): TopBarActionsMenu => {
    if (isSharedView) return sharedActionsMenu();
    if (isRecentsView) return recentsActionsMenu();
    if (isTrashView) return trashActionsMenu();

    return driveActionsMenu();
  };

  useEffect(() => {
    setBlob(null);
    if (dirtyName) {
      setCurrentFile?.({
        ...currentFile,
        plainName: dirtyName,
      });
    }
    dispatch(uiActions.setCurrentEditingNameDirty(''));
  }, [dirtyName, currentFile]);

  const driveItemsOrder = useAppSelector((state) => state.storage.driveItemsOrder);
  const driveItemsSort = useAppSelector((state) => state.storage.driveItemsSort);

  // Get all files in the current folder, sort the files and find the current file to display the file
  const currentItemsFolder = useAppSelector((state) => state.storage.levels[file?.folderId || '']);
  const folderFiles = useMemo(() => currentItemsFolder?.filter((item) => !item.isFolder), [currentItemsFolder]);

  const sortFolderFiles = useMemo(() => {
    if (folderFiles) {
      return folderFiles.sort((a, b) => {
        if (driveItemsOrder === OrderDirection.Asc) return a[driveItemsSort] > b[driveItemsSort];
        else if (driveItemsOrder === OrderDirection.Desc) return a[driveItemsSort] < b[driveItemsSort];
      });
    }
    return [];
  }, [folderFiles]);
  const fileIndex = sortFolderFiles?.findIndex((item) => item.id === currentFile?.id);
  const totalFolderIndex = sortFolderFiles?.length;

  //Switch to the next or previous file in the folder
  function changeFile(direction: 'next' | 'prev') {
    setBlob(null);
    if (direction === 'next') {
      setCurrentFile?.(sortFolderFiles[fileIndex + 1]);
    } else {
      setCurrentFile?.(sortFolderFiles[fileIndex - 1]);
    }
  }

  function downloadFile(currentFile: PreviewFileItem, abortController: AbortController) {
    setBlob(null);
    return downloadService.fetchFileBlob(
      { ...currentFile, bucketId: currentFile.bucket },
      {
        updateProgressCallback: (progress) => setUpdateProgress(progress),
        isTeam,
        abortController,
      },
      currentFile.credentials,
      currentFile.mnemonic,
    );
  }

  const handleFileThumbnail = async (driveFile: PreviewFileItem, file: File) => {
    const currentThumbnail = driveFile.thumbnails && driveFile.thumbnails.length > 0 ? driveFile.thumbnails[0] : null;
    const databaseThumbnail = await getDatabaseFilePreviewData({ fileId: driveFile.id });

    const fileObject = new File([file], driveFile.name);
    const fileUpload: FileToUpload = {
      name: driveFile.name,
      size: driveFile.size,
      type: driveFile.type,
      content: fileObject,
      parentFolderId: driveFile.folderId,
    };

    const thumbnailGenerated = await getThumbnailFrom(fileUpload);

    const isDifferentThumbnailOrNotExists =
      !currentThumbnail || !compareThumbnail(currentThumbnail, thumbnailGenerated);

    if (thumbnailGenerated.file && isDifferentThumbnailOrNotExists) {
      const thumbnailToUpload: ThumbnailToUpload = {
        fileId: driveFile.id,
        size: thumbnailGenerated.file.size,
        max_width: thumbnailGenerated.max_width,
        max_height: thumbnailGenerated.max_height,
        type: thumbnailGenerated.type,
        content: thumbnailGenerated.file,
      };
      let thumbnailUploaded;

      if (thumbnailUploaded && thumbnailGenerated.file) {
        setCurrentThumbnail(thumbnailGenerated.file, thumbnailUploaded, driveFile as DriveItemData, dispatch);

        let newThumbnails: Thumbnail[];
        if (currentThumbnail) {
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
          previewBlob: thumbnailToUpload.content,
          updatedAt: driveFile.updatedAt,
        });
      }
    } else if (!databaseThumbnail && thumbnailGenerated?.file) {
      await updateDatabaseFilePreviewData({
        fileId: driveFile.id,
        folderId: driveFile.folderId,
        previewBlob: new Blob([thumbnailGenerated?.file], { type: thumbnailGenerated.file?.type }),
        updatedAt: driveFile.updatedAt,
      });
    }
  };

  function getFileContentManager() {
    const abortController = new AbortController();

    return {
      download: async (): Promise<Blob> => {
        const shouldFileBeCached = canFileBeCached(currentFile);

        const fileSource = await getDatabaseFileSourceData({ fileId: currentFile.id });
        const isCached = !!fileSource;
        let fileContent: Blob;

        if (isCached) {
          const isCacheExpired = !fileSource?.updatedAt
            ? true
            : dateService.isDateOneBefore({
                dateOne: fileSource?.updatedAt,
                dateTwo: currentFile?.updatedAt,
              });
          if (isCacheExpired) {
            fileContent = await downloadFile(currentFile, abortController);
            await updateDatabaseFileSourceData({
              folderId: currentFile.folderId,
              sourceBlob: fileContent,
              fileId: currentFile.id,
              updatedAt: currentFile.updatedAt,
            });
          } else {
            fileContent = fileSource.source as Blob;
            await handleFileThumbnail(currentFile, fileSource.source as File);
          }
        } else {
          fileContent = await downloadFile(currentFile, abortController);
          if (shouldFileBeCached) {
            await updateDatabaseFileSourceData({
              folderId: currentFile.folderId,
              sourceBlob: fileContent,
              fileId: currentFile.id,
              updatedAt: currentFile.updatedAt,
            });
          }
        }

        return fileContent;
      },
      abort: () => {
        abortController.abort();
      },
    };
  }

  const fileContentManager = getFileContentManager();

  useEffect(() => {
    setBlob(null);
    if (currentFile) {
      fileContentManager
        .download()
        .then((blob) => {
          setBlob(blob);
        })
        .catch((error) => {
          if (error.name === 'AbortError') {
            return;
          }
          console.error(error);
          setBlob(null);
          errorService.reportError(error);
        });
    }
  }, [showPreview, currentFile]);

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
      dropdownItems={topDropdownBarActionsMenu()}
      isShareView={isSharedView}
    />
  ) : (
    <div className="hidden" />
  );
};

export default FileViewerWrapper;
