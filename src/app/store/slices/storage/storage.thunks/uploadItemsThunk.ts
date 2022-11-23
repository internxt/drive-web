import { ActionReducerMapBuilder, createAsyncThunk } from '@reduxjs/toolkit';
import { items as itemUtils } from '@internxt/lib';
import { storageActions, storageSelectors } from '..';
import { StorageState } from '../storage.model';
import { sessionSelectors } from '../../session/session.selectors';
import { RootState } from '../../..';
import { planThunks } from '../../plan';
import { uiActions } from '../../ui';
import { TaskStatus, TaskType, UploadFileTask } from 'app/tasks/types';
import tasksService from 'app/tasks/services/tasks.service';
import errorService from 'app/core/services/error.service';
import i18n from 'app/i18n/services/i18n.service';
import { renameFile } from 'app/crypto/services/utils';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';
import { MAX_ALLOWED_UPLOAD_SIZE } from 'app/drive/services/network.service';
import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import { DriveFileData, DriveItemData } from 'app/drive/types';
import { FileToUpload } from 'app/drive/services/file.service/uploadFile';
import fileService from 'app/drive/services/file.service';
import { SdkFactory } from '../../../../core/factory/sdk';

interface UploadItemsThunkOptions {
  relatedTaskId: string;
  showNotifications: boolean;
  showErrors: boolean;
  onSuccess: () => void;
}

interface UploadItemsPayload {
  files: File[];
  parentFolderId: number;
  options?: Partial<UploadItemsThunkOptions>;
}

const DEFAULT_OPTIONS: Partial<UploadItemsThunkOptions> = { showNotifications: true, showErrors: true };

const showEmptyFilesNotification = (zeroLengthFilesNumber: number) => {
  if (zeroLengthFilesNumber > 0) {
    const fileText = zeroLengthFilesNumber === 1 ? 'file' : 'files';

    notificationsService.show({
      text: `Empty files are not supported.\n${zeroLengthFilesNumber} empty ${fileText} not uploaded.`,
      type: ToastType.Warning,
    });
  }
};

/**
 * @description
 *  1. Prepare files to upload
 *  2. Schedule tasks
 */
export const uploadItemsThunk = createAsyncThunk<void, UploadItemsPayload, { state: RootState }>(
  'storage/uploadItems',
  async ({ files, parentFolderId, options }: UploadItemsPayload, { getState, dispatch }) => {
    const user = getState().user.user as UserSettings;
    const showSizeWarning = files.some((file) => file.size > MAX_ALLOWED_UPLOAD_SIZE);
    const isTeam: boolean = sessionSelectors.isTeam(getState());
    const filesToUpload: FileToUpload[] = [];
    const errors: Error[] = [];
    const tasksIds: string[] = [];

    options = Object.assign(DEFAULT_OPTIONS, options || {});

    try {
      const planLimit = getState().plan.planLimit;
      const planUsage = getState().plan.planUsage;

      if (planLimit && planUsage >= planLimit) {
        dispatch(uiActions.setIsReachedPlanLimitDialogOpen(true));
        return;
      }
    } catch (err: unknown) {
      console.error(err);
    }

    if (showSizeWarning) {
      notificationsService.show({
        text: 'File too large.\nYou can only upload or download files of up to 1GB through the web app',
        type: ToastType.Warning,
      });
      return;
    }

    const storageClient = SdkFactory.getInstance().createStorageClient();

    let zeroLengthFilesNumber = 0;
    for (const file of files) {
      if (file.size === 0) {
        zeroLengthFilesNumber = zeroLengthFilesNumber + 1;
        continue;
      }
      const { filename, extension } = itemUtils.getFilenameAndExt(file.name);
      const [parentFolderContentPromise, requestCanceler] = storageClient.getFolderContent(parentFolderId);
      const taskId = tasksService.create<UploadFileTask>({
        relatedTaskId: options?.relatedTaskId,
        action: TaskType.UploadFile,
        fileName: filename,
        fileType: extension,
        isFileNameValidated: false,
        showNotification: !!options?.showNotifications,
        cancellable: true,
        stop: async () => requestCanceler.cancel(),
      });

      const parentFolderContent = await parentFolderContentPromise;
      const [, , finalFilename] = itemUtils.renameIfNeeded(parentFolderContent.files, filename, extension);
      const fileContent = renameFile(file, finalFilename);

      tasksService.updateTask({
        taskId,
        merge: {
          fileName: finalFilename,
          isFileNameValidated: true,
        },
      });

      filesToUpload.push({
        name: finalFilename,
        size: file.size,
        type: extension,
        content: fileContent,
        parentFolderId,
      });

      tasksIds.push(taskId);
    }

    showEmptyFilesNotification(zeroLengthFilesNumber);

    const abortController = new AbortController();

    // 2.
    for (const [index, file] of filesToUpload.entries()) {
      if (abortController.signal.aborted) break;

      const taskId = tasksIds[index];
      const updateProgressCallback = (progress) => {
        const task = tasksService.findTask(taskId);

        if (task?.status !== TaskStatus.Cancelled) {
          tasksService.updateTask({
            taskId: taskId,
            merge: {
              status: TaskStatus.InProcess,
              progress,
            },
          });
        }
      };
      const taskFn = async (): Promise<DriveFileData> => {
        const uploadFilePromise = fileService.uploadFile(
          user.email,
          file,
          isTeam,
          updateProgressCallback,
          abortController,
        );

        tasksService.updateTask({
          taskId,
          merge: {
            status: TaskStatus.Encrypting,
            stop: async () => {
              abortController.abort();
            },
          },
        });

        const uploadedFile = await uploadFilePromise;

        uploadedFile.name = file.name;

        return uploadedFile;
      };

      file.parentFolderId = parentFolderId;

      await taskFn()
        .then((uploadedFile) => {
          const currentFolderId = storageSelectors.currentFolderId(getState());

          if (uploadedFile.folderId === currentFolderId) {
            dispatch(
              storageActions.pushItems({
                updateRecents: true,
                folderIds: [currentFolderId],
                items: uploadedFile as DriveItemData,
              }),
            );
          }

          tasksService.updateTask({
            taskId: taskId,
            merge: { status: TaskStatus.Success },
          });
        })
        .catch((err: unknown) => {
          if (abortController.signal.aborted) {
            return tasksService.updateTask({
              taskId: taskId,
              merge: { status: TaskStatus.Cancelled },
            });
          }

          const castedError = errorService.castError(err);
          const task = tasksService.findTask(tasksIds[index]);

          if (task?.status !== TaskStatus.Cancelled) {
            tasksService.updateTask({
              taskId: taskId,
              merge: { status: TaskStatus.Error },
            });

            console.error(castedError);

            errors.push(castedError);
          }
        });
    }

    options.onSuccess?.();

    dispatch(planThunks.fetchUsageThunk());

    if (errors.length > 0) {
      for (const error of errors) {
        notificationsService.show({ text: error.message, type: ToastType.Error });
      }

      throw new Error(i18n.get('error.uploadingItems'));
    }
  },
);

export const uploadItemsThunkNoCheck = createAsyncThunk<void, UploadItemsPayload, { state: RootState }>(
  'storage/uploadItems',
  async ({ files, parentFolderId, options }: UploadItemsPayload, { getState, dispatch }) => {
    const user = getState().user.user as UserSettings;
    const showSizeWarning = files.some((file) => file.size > MAX_ALLOWED_UPLOAD_SIZE);
    const isTeam: boolean = sessionSelectors.isTeam(getState());
    const filesToUpload: FileToUpload[] = [];
    const errors: Error[] = [];
    const tasksIds: string[] = [];
    const abortController = new AbortController();

    options = Object.assign(DEFAULT_OPTIONS, options || {});

    try {
      const planLimit = getState().plan.planLimit;
      const planUsage = getState().plan.planUsage;

      if (planLimit && planUsage >= planLimit) {
        dispatch(uiActions.setIsReachedPlanLimitDialogOpen(true));
        return;
      }
    } catch (err: unknown) {
      console.error(err);
    }

    if (showSizeWarning) {
      notificationsService.show({
        text: 'File too large.\nYou can only upload or download files of up to 1GB through the web app',
        type: ToastType.Warning,
      });
      return;
    }

    let zeroLengthFilesNumber = 0;
    for (const file of files) {
      if (file.size === 0) {
        zeroLengthFilesNumber = zeroLengthFilesNumber + 1;
        continue;
      }
      const { filename, extension } = itemUtils.getFilenameAndExt(file.name);
      const taskId = tasksService.create<UploadFileTask>({
        relatedTaskId: options?.relatedTaskId,
        action: TaskType.UploadFile,
        fileName: filename,
        fileType: extension,
        isFileNameValidated: false,
        showNotification: !!options?.showNotifications,
        cancellable: true,
        stop: async () => abortController.abort(),
      });
      const fileContent = renameFile(file, filename);

      tasksService.updateTask({
        taskId,
        merge: {
          fileName: filename,
          isFileNameValidated: true,
        },
      });

      filesToUpload.push({
        name: filename,
        size: file.size,
        type: extension,
        content: fileContent,
        parentFolderId,
      });

      tasksIds.push(taskId);
    }
    showEmptyFilesNotification(zeroLengthFilesNumber);

    // 2.
    for (const [index, file] of filesToUpload.entries()) {
      if (abortController.signal.aborted) break;

      const taskId = tasksIds[index];
      const updateProgressCallback = (progress) => {
        const task = tasksService.findTask(taskId);

        if (task?.status !== TaskStatus.Cancelled) {
          tasksService.updateTask({
            taskId: taskId,
            merge: {
              status: TaskStatus.InProcess,
              progress,
            },
          });
        }
      };
      const taskFn = async (): Promise<DriveFileData> => {
        const uploadFilePromise = fileService.uploadFile(
          user.email,
          file,
          isTeam,
          updateProgressCallback,
          abortController,
        );

        tasksService.updateTask({
          taskId,
          merge: {
            status: TaskStatus.Encrypting,
            stop: async () => {
              abortController.abort();
            },
          },
        });

        const uploadedFile = await uploadFilePromise;
        uploadedFile.name = file.name;
        return uploadedFile;
      };

      file.parentFolderId = parentFolderId;

      await taskFn()
        .then((uploadedFile) => {
          const currentFolderId = storageSelectors.currentFolderId(getState());

          if (uploadedFile.folderId === currentFolderId) {
            dispatch(
              storageActions.pushItems({
                updateRecents: true,
                folderIds: [currentFolderId],
                items: uploadedFile as DriveItemData,
              }),
            );
          }

          tasksService.updateTask({
            taskId: taskId,
            merge: { status: TaskStatus.Success },
          });
        })
        .catch((err: unknown) => {
          if (abortController.signal.aborted) {
            return tasksService.updateTask({
              taskId: taskId,
              merge: { status: TaskStatus.Cancelled },
            });
          }

          const castedError = errorService.castError(err);
          const task = tasksService.findTask(tasksIds[index]);

          if (task?.status !== TaskStatus.Cancelled) {
            tasksService.updateTask({
              taskId: taskId,
              merge: { status: TaskStatus.Error },
            });
            console.error(castedError);
            errors.push(castedError);
          }
        });
    }
    options.onSuccess?.();
    dispatch(planThunks.fetchUsageThunk());

    if (errors.length > 0) {
      for (const error of errors) {
        notificationsService.show({ text: error.message, type: ToastType.Error });
      }
      throw new Error(i18n.get('error.uploadingItems'));
    }
  },
);

/**
 * @description
 *  1. Prepare files to upload
 *  2. Schedule tasks
 */
export const uploadItemsParallelThunk = createAsyncThunk<void, UploadItemsPayload, { state: RootState }>(
  'storage/uploadItems',
  async ({ files, parentFolderId, options }: UploadItemsPayload, { getState, dispatch }) => {
    const user = getState().user.user as UserSettings;
    const showSizeWarning = files.some((file) => file.size > MAX_ALLOWED_UPLOAD_SIZE);
    const isTeam: boolean = sessionSelectors.isTeam(getState());
    const filesToUpload: FileToUpload[] = [];
    const errors: Error[] = [];
    const tasksIds: string[] = [];

    options = Object.assign(DEFAULT_OPTIONS, options || {});

    try {
      const planLimit = getState().plan.planLimit;
      const planUsage = getState().plan.planUsage;

      if (planLimit && planUsage >= planLimit) {
        dispatch(uiActions.setIsReachedPlanLimitDialogOpen(true));
        return;
      }
    } catch (err: unknown) {
      console.error(err);
    }

    if (showSizeWarning) {
      notificationsService.show({
        text: 'File too large.\nYou can only upload or download files of up to 1GB through the web app',
        type: ToastType.Warning,
      });
      return;
    }

    const storageClient = SdkFactory.getInstance().createStorageClient();
    const [parentFolderContentPromise, requestCanceler] = storageClient.getFolderContent(parentFolderId);
    const parentFolderContent = await parentFolderContentPromise;

    let zeroLengthFilesNumber = 0;
    for (const file of files) {
      if (file.size === 0) {
        zeroLengthFilesNumber = zeroLengthFilesNumber + 1;
        continue;
      }
      const { filename, extension } = itemUtils.getFilenameAndExt(file.name);
      const taskId = tasksService.create<UploadFileTask>({
        relatedTaskId: options?.relatedTaskId,
        action: TaskType.UploadFile,
        fileName: filename,
        fileType: extension,
        isFileNameValidated: false,
        showNotification: !!options?.showNotifications,
        cancellable: true,
        stop: async () => requestCanceler.cancel(),
      });

      const [, , finalFilename] = itemUtils.renameIfNeeded(parentFolderContent.files, filename, extension);
      const fileContent = renameFile(file, finalFilename);

      tasksService.updateTask({
        taskId,
        merge: {
          fileName: finalFilename,
          isFileNameValidated: true,
        },
      });

      filesToUpload.push({
        name: finalFilename,
        size: file.size,
        type: extension,
        content: fileContent,
        parentFolderId,
      });

      tasksIds.push(taskId);
    }
    showEmptyFilesNotification(zeroLengthFilesNumber);

    const abortController = new AbortController();

    // 2.
    const uploadPromises: Promise<DriveFileData>[] = [];

    for (const [index, file] of filesToUpload.entries()) {
      if (abortController.signal.aborted) break;

      const taskId = tasksIds[index];
      const updateProgressCallback = (progress) => {
        const task = tasksService.findTask(taskId);

        if (task?.status !== TaskStatus.Cancelled) {
          tasksService.updateTask({
            taskId: taskId,
            merge: {
              status: TaskStatus.InProcess,
              progress,
            },
          });
        }
      };

      const uploadFilePromise = fileService.uploadFile(
        user.email,
        file,
        isTeam,
        updateProgressCallback,
        abortController,
      );

      tasksService.updateTask({
        taskId,
        merge: {
          status: TaskStatus.Encrypting,
          stop: async () => {
            abortController.abort();
          },
        },
      });

      uploadPromises.push(
        uploadFilePromise.then((uploadedFile) => {
          uploadedFile.name = file.name;

          return uploadedFile;
        }),
      );

      file.parentFolderId = parentFolderId;

      uploadPromises.map((filePromise) => {
        return filePromise
          .then((uploadedFile) => {
            const currentFolderId = storageSelectors.currentFolderId(getState());

            if (uploadedFile.folderId === currentFolderId) {
              dispatch(
                storageActions.pushItems({
                  updateRecents: true,
                  folderIds: [currentFolderId],
                  items: uploadedFile as DriveItemData,
                }),
              );
            }

            tasksService.updateTask({
              taskId: taskId,
              merge: { status: TaskStatus.Success },
            });
          })
          .catch((err: unknown) => {
            if (abortController.signal.aborted) {
              return tasksService.updateTask({
                taskId: taskId,
                merge: { status: TaskStatus.Cancelled },
              });
            }

            const castedError = errorService.castError(err);
            const task = tasksService.findTask(tasksIds[index]);

            if (task?.status !== TaskStatus.Cancelled) {
              tasksService.updateTask({
                taskId: taskId,
                merge: { status: TaskStatus.Error },
              });

              console.error(castedError);

              errors.push(castedError);
            }
          });
      });
    }

    await Promise.all(uploadPromises);

    options.onSuccess?.();

    dispatch(planThunks.fetchUsageThunk());

    if (errors.length > 0) {
      for (const error of errors) {
        notificationsService.show({ text: error.message, type: ToastType.Error });
      }

      throw new Error(i18n.get('error.uploadingItems'));
    }
  },
);

export const uploadItemsParallelThunkNoCheck = createAsyncThunk<void, UploadItemsPayload, { state: RootState }>(
  'storage/uploadItems',
  async ({ files, parentFolderId, options }: UploadItemsPayload, { getState, dispatch }) => {
    const user = getState().user.user as UserSettings;
    const showSizeWarning = files.some((file) => file.size > MAX_ALLOWED_UPLOAD_SIZE);
    const isTeam: boolean = sessionSelectors.isTeam(getState());
    const filesToUpload: FileToUpload[] = [];
    const errors: Error[] = [];
    const tasksIds: string[] = [];
    const abortController = new AbortController();

    options = Object.assign(DEFAULT_OPTIONS, options || {});

    try {
      const planLimit = getState().plan.planLimit;
      const planUsage = getState().plan.planUsage;

      if (planLimit && planUsage >= planLimit) {
        dispatch(uiActions.setIsReachedPlanLimitDialogOpen(true));
        return;
      }
    } catch (err: unknown) {
      console.error(err);
    }

    if (showSizeWarning) {
      notificationsService.show({
        text: 'File too large.\nYou can only upload or download files of up to 1GB through the web app',
        type: ToastType.Warning,
      });
      return;
    }

    let zeroLengthFilesNumber = 0;
    for (const file of files) {
      if (file.size === 0) {
        zeroLengthFilesNumber = zeroLengthFilesNumber + 1;
        continue;
      }
      const { filename, extension } = itemUtils.getFilenameAndExt(file.name);
      const taskId = tasksService.create<UploadFileTask>({
        relatedTaskId: options?.relatedTaskId,
        action: TaskType.UploadFile,
        fileName: filename,
        fileType: extension,
        isFileNameValidated: false,
        showNotification: !!options?.showNotifications,
        cancellable: true,
        stop: async () => abortController.abort(),
      });

      const fileContent = renameFile(file, filename);

      tasksService.updateTask({
        taskId,
        merge: {
          fileName: filename,
          isFileNameValidated: true,
        },
      });

      filesToUpload.push({
        name: filename,
        size: file.size,
        type: extension,
        content: fileContent,
        parentFolderId,
      });

      tasksIds.push(taskId);
    }
    showEmptyFilesNotification(zeroLengthFilesNumber);

    // 2.
    const uploadPromises: Promise<DriveFileData>[] = [];

    for (const [index, file] of filesToUpload.entries()) {
      if (abortController.signal.aborted) break;

      const taskId = tasksIds[index];
      const updateProgressCallback = (progress) => {
        const task = tasksService.findTask(taskId);

        if (task?.status !== TaskStatus.Cancelled) {
          tasksService.updateTask({
            taskId: taskId,
            merge: {
              status: TaskStatus.InProcess,
              progress,
            },
          });
        }
      };

      const uploadFilePromise = fileService.uploadFile(
        user.email,
        file,
        isTeam,
        updateProgressCallback,
        abortController,
      );

      tasksService.updateTask({
        taskId,
        merge: {
          status: TaskStatus.Encrypting,
          stop: async () => {
            abortController.abort();
          },
        },
      });

      uploadPromises.push(
        uploadFilePromise.then((uploadedFile) => {
          uploadedFile.name = file.name;

          return uploadedFile;
        }),
      );

      file.parentFolderId = parentFolderId;

      uploadPromises.map((filePromise) => {
        return filePromise
          .then((uploadedFile) => {
            const currentFolderId = storageSelectors.currentFolderId(getState());

            if (uploadedFile.folderId === currentFolderId) {
              dispatch(
                storageActions.pushItems({
                  updateRecents: true,
                  folderIds: [currentFolderId],
                  items: uploadedFile as DriveItemData,
                }),
              );
            }

            tasksService.updateTask({
              taskId: taskId,
              merge: { status: TaskStatus.Success },
            });
          })
          .catch((err: unknown) => {
            if (abortController.signal.aborted) {
              return tasksService.updateTask({
                taskId: taskId,
                merge: { status: TaskStatus.Cancelled },
              });
            }

            const castedError = errorService.castError(err);
            const task = tasksService.findTask(tasksIds[index]);

            if (task?.status !== TaskStatus.Cancelled) {
              tasksService.updateTask({
                taskId: taskId,
                merge: { status: TaskStatus.Error },
              });

              console.error(castedError);

              errors.push(castedError);
            }
          });
      });
    }

    await Promise.all(uploadPromises);

    options.showNotifications = true;
    options.onSuccess?.();

    dispatch(planThunks.fetchUsageThunk());

    if (errors.length > 0) {
      for (const error of errors) {
        notificationsService.show({ text: error.message, type: ToastType.Error });
      }

      throw new Error(i18n.get('error.uploadingItems'));
    }
  },
);

export const uploadItemsThunkExtraReducers = (builder: ActionReducerMapBuilder<StorageState>): void => {
  builder
    .addCase(uploadItemsThunk.pending, () => undefined)
    .addCase(uploadItemsThunk.fulfilled, () => undefined)
    .addCase(uploadItemsThunk.rejected, (state, action) => {
      const requestOptions = Object.assign(DEFAULT_OPTIONS, action.meta.arg.options || {});

      if (requestOptions?.showErrors) {
        notificationsService.show({
          text: i18n.get('error.uploadingFile', { reason: action.error.message || '' }),
          type: ToastType.Error,
        });
      }
    });
};
