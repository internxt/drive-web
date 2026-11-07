import { useReduxActions } from 'app/store/slices/storage/hooks/useReduxActions';
import RetryManager, { RetryableTask, RetryableTaskStatus, RetryableTaskType } from 'app/network/RetryManager';
import { DownloadManager } from 'app/network/DownloadManager';
import { useAppSelector } from 'app/store/hooks';
import workspacesSelectors from 'app/store/slices/workspaces/workspaces.selectors';
import { renameFile } from 'app/crypto/services/utils';
import { FileToUpload } from 'app/drive/services/file.service/types';
import { DownloadItemType } from 'app/drive/services/downloadManager.service';
import { UploadManagerFileParams } from 'app/tasks/upload/uploadFilesWithTasks';
import { FailedItemToRetry } from '../TaskToRetryItem/TaskToRetryItem';
import { enqueueRetry } from '../../services/retryQueue';

type DisplayData = Pick<FailedItemToRetry, 'name' | 'type' | 'size' | 'modifiedAt' | 'isFolder'>;

const withFullName = ({ content, name, type }: FileToUpload): File =>
  renameFile(content, type ? `${name}.${type}` : name);

const getUploadDisplayData = (params: UploadManagerFileParams): DisplayData => ({
  name: params.filecontent.name,
  type: params.filecontent.type,
  size: params.filecontent.size,
  modifiedAt: params.filecontent.content.lastModified,
});

const getDownloadDisplayData = (item: DownloadItemType): DisplayData => ({
  name: item.plainName ?? item.name,
  type: item.type,
  size: item.size,
  modifiedAt: item.updatedAt,
  isFolder: item.isFolder,
});

const getDisplayData = (task: RetryableTask): DisplayData => {
  switch (task.type) {
    case RetryableTaskType.Upload:
      return getUploadDisplayData(task.params);
    case RetryableTaskType.Download:
      return getDownloadDisplayData(task.params);
  }
};

const getTaskId = ({ taskId, params }: RetryableTask): string => taskId ?? params?.taskId ?? '';

const changeRetryStatus = (task: RetryableTask, status: RetryableTaskStatus): void => {
  if (task.type === RetryableTaskType.Download) {
    RetryManager.changeStatus(getTaskId(task), status, { id: task.params?.id });
    return;
  }
  RetryManager.changeStatus(getTaskId(task), status);
};

/**
 * Failed items kept in the retry manager: downloads, and uploads not yet tracked by their task.
 */
export const useRetryManagerFailedItems = (tasks: RetryableTask[]): FailedItemToRetry[] => {
  const { uploadRetryItem } = useReduxActions();
  const selectedWorkspace = useAppSelector(workspacesSelectors.getSelectedWorkspace);
  const workspaceCredentials = useAppSelector(workspacesSelectors.getWorkspaceCredentials);

  const retryUpload = async (task: RetryableTask) => {
    const { params } = task;
    try {
      await uploadRetryItem({
        uploadFile: withFullName(params.filecontent),
        parentFolderId: params?.parentFolderId,
        taskId: getTaskId(task),
        fileType: params?.filecontent?.type ?? '',
      }).unwrap();
    } catch {
      changeRetryStatus(task, RetryableTaskStatus.Failed);
    }
  };

  const retryDownload = async (task: RetryableTask) => {
    try {
      await DownloadManager.downloadItem({
        payload: [task.params],
        selectedWorkspace,
        workspaceCredentials,
        taskId: task.taskId,
      });
    } finally {
      changeRetryStatus(task, RetryableTaskStatus.Failed);
    }
  };

  const runRetry = (task: RetryableTask) => {
    switch (task.type) {
      case RetryableTaskType.Upload:
        return retryUpload(task);
      case RetryableTaskType.Download:
        return retryDownload(task);
    }
  };

  const retryTask = (task: RetryableTask) => {
    changeRetryStatus(task, RetryableTaskStatus.Retrying);
    enqueueRetry(() => runRetry(task));
  };

  return tasks.map((task) => ({
    ...getDisplayData(task),
    isRetryable: task.retryable !== false,
    isRetrying: task.status === RetryableTaskStatus.Retrying,
    retry: () => retryTask(task),
  }));
};
