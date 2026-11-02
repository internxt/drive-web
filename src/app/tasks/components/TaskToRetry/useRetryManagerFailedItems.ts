import RetryManager, { RetryableTask, RetryableTaskStatus } from 'app/network/RetryManager';
import { DownloadManager } from 'app/network/DownloadManager';
import { useAppSelector } from 'app/store/hooks';
import workspacesSelectors from 'app/store/slices/workspaces/workspaces.selectors';
import { DownloadItemType } from 'app/drive/services/downloadManager.service';
import { FailedItemToRetry } from '../TaskToRetryItem/TaskToRetryItem';
import { enqueueRetry } from '../../services/retryQueue';

type DisplayData = Pick<FailedItemToRetry, 'name' | 'type' | 'size' | 'modifiedAt' | 'isFolder'>;

const getDisplayData = (item: DownloadItemType): DisplayData => ({
  name: item.plainName ?? item.name,
  type: item.type,
  size: item.size,
  modifiedAt: item.updatedAt,
  isFolder: item.isFolder,
});

const getTaskId = ({ taskId, params }: RetryableTask): string => taskId ?? params?.taskId ?? '';

const changeRetryStatus = (task: RetryableTask, status: RetryableTaskStatus): void =>
  RetryManager.changeStatus(getTaskId(task), status, { id: task.params?.id });

/**
 * Failed downloads kept in the retry manager. Failed uploads are kept by their own task instead.
 */
export const useRetryManagerFailedItems = (tasks: RetryableTask[]): FailedItemToRetry[] => {
  const selectedWorkspace = useAppSelector(workspacesSelectors.getSelectedWorkspace);
  const workspaceCredentials = useAppSelector(workspacesSelectors.getWorkspaceCredentials);

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

  const retryTask = (task: RetryableTask) => {
    changeRetryStatus(task, RetryableTaskStatus.Retrying);
    enqueueRetry(() => retryDownload(task));
  };

  return tasks.map((task) => ({
    ...getDisplayData(task.params),
    isRetryable: task.retryable !== false,
    isRetrying: task.status === RetryableTaskStatus.Retrying,
    retry: () => retryTask(task),
  }));
};
