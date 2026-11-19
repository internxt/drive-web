import { WorkspaceData } from '@internxt/sdk/dist/workspaces';
import { t } from 'i18next';
import { AppDispatch } from 'app/store';
import { uiActions } from 'app/store/slices/ui';
import storageThunks from 'app/store/slices/storage/storage.thunks';
import { CollisionGroup } from 'app/store/slices/storage/storage.model';
import { fetchSortedFolderContentThunk } from 'app/store/slices/storage/storage.thunks/fetchSortedFolderContentThunk';
import {
  handleRepeatedUploadingFiles,
  handleRepeatedUploadingFolders,
} from 'app/store/slices/storage/storage.thunks/renameItemsThunk';
import { IRoot } from 'app/store/slices/storage/types';
import { uploadFoldersWithTracking } from 'app/drive/services/folder.service/uploadFoldersWithTracking';
import { DriveItemData } from 'app/drive/types';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';
import errorService from 'services/error.service';

export const UPLOAD_ITEMS_LIMIT = 3000;

export interface UploadDestination {
  dispatch: AppDispatch;
  currentFolderId: string;
  selectedWorkspace: WorkspaceData | null;
  maxUploadFileSize: number;
}

interface RepeatedItemsCheck<T> {
  repeatedItems: T[];
  existingItems: DriveItemData[];
  unrepeatedItems: T[];
}

const noRepeatedItems = <T>(): RepeatedItemsCheck<T> => ({ repeatedItems: [], existingItems: [], unrepeatedItems: [] });

const buildCollisionGroups = (destinationUuid: string, checks: RepeatedItemsCheck<unknown>[]): CollisionGroup[] =>
  checks
    .filter((check) => check.repeatedItems.length > 0)
    .map(
      (check) =>
        ({
          destinationUuid,
          duplicatedItems: check.repeatedItems,
          existingItems: check.existingItems,
          unrepeatedItems: check.unrepeatedItems,
        }) as CollisionGroup,
    );

const notifyUploadItemsLimitExceeded = (dispatch: AppDispatch) => {
  dispatch(uiActions.setIsUploadItemsFailsDialogOpen(true));
  notificationsService.show({
    text: t('drive.uploadItems.advice'),
    type: ToastType.Warning,
  });
};

export const notifyUploadFailed = (error: unknown) => {
  const uploadError = errorService.castError(error);
  errorService.reportError(uploadError);
  notificationsService.show({ text: uploadError.message, type: ToastType.Error, requestId: uploadError.requestId });
};

const checkAndUploadItems = async (
  { dispatch, currentFolderId, selectedWorkspace, maxUploadFileSize }: UploadDestination,
  rootList: IRoot[],
  files: File[],
): Promise<void> => {
  if (files.length > UPLOAD_ITEMS_LIMIT) {
    notifyUploadItemsLimitExceeded(dispatch);
    return;
  }

  const [filesCheck, foldersCheck] = await Promise.all([
    files.length > 0 ? handleRepeatedUploadingFiles(files, currentFolderId) : noRepeatedItems<File>(),
    rootList.length > 0 ? handleRepeatedUploadingFolders(rootList, currentFolderId) : noRepeatedItems<IRoot>(),
  ]);

  const collisionGroups = buildCollisionGroups(currentFolderId, [filesCheck, foldersCheck]);
  if (collisionGroups.length > 0) {
    dispatch(
      uiActions.setIsNameCollisionDialogOpen({ open: true, info: { groups: collisionGroups, operation: 'upload' } }),
    );
  }

  if (filesCheck.unrepeatedItems.length > 0) {
    dispatch(
      storageThunks.uploadItemsThunk({
        files: filesCheck.unrepeatedItems as File[],
        parentFolderId: currentFolderId,
      }),
    ).then(() => {
      dispatch(fetchSortedFolderContentThunk(currentFolderId));
    });
  }

  if (foldersCheck.unrepeatedItems.length > 0) {
    await uploadFoldersWithTracking({
      payload: (foldersCheck.unrepeatedItems as IRoot[]).map((root) => ({ root, currentFolderId })),
      selectedWorkspace,
      dispatch,
      maxUploadFileSize,
    });
    await dispatch(fetchSortedFolderContentThunk(currentFolderId));
  }
};

export const uploadItemsToFolder = async (
  destination: UploadDestination,
  rootList: IRoot[],
  files: File[],
): Promise<void> => {
  try {
    await checkAndUploadItems(destination, rootList, files);
  } catch (error) {
    notifyUploadFailed(error);
  }
};
