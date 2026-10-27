import { X } from '@phosphor-icons/react';
import { queue } from 'async';
import { useReduxActions } from 'app/store/slices/storage/hooks/useReduxActions';
import { FixedSizeList as List } from 'react-window';
import TaskToRetryItem from '../TaskToRetryItem/TaskToRetryItem';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import RetryManager, { RetryableTask, RetryableTaskStatus, RetryableTaskType } from '../../../network/RetryManager';
import { Modal, Button } from '@internxt/ui';
import RestartIcon from '../../../../assets/icons/tasklogger/circle-arrow.svg?react';
import { DownloadManager } from '../../../network/DownloadManager';
import { useAppSelector } from '../../../store/hooks';
import workspacesSelectors from '../../../store/slices/workspaces/workspaces.selectors';
import { renameFile } from '../../../crypto/services/utils';
import { FileToUpload } from 'app/drive/services/file.service/types';
import { QueueUtilsService } from 'utils/queueUtils';
import errorService from 'services/error.service';

interface TaskToRetryProps {
  isOpen: boolean;
  files: RetryableTask[];
  onClose: () => void;
}

const withFullName = ({ content, name, type }: FileToUpload): File =>
  renameFile(content, type ? `${name}.${type}` : name);

const getTaskId = ({ taskId, params }: Pick<RetryableTask, 'taskId' | 'params'>): string =>
  taskId ?? params?.taskId ?? '';

const RETRY_ALL_CONCURRENCY = 6;

const TaskToRetry = ({ isOpen, files, onClose }: TaskToRetryProps): JSX.Element => {
  const { uploadRetryItem } = useReduxActions();
  const { translate } = useTranslationContext();
  const selectedWorkspace = useAppSelector(workspacesSelectors.getSelectedWorkspace);
  const workspaceCredentials = useAppSelector(workspacesSelectors.getWorkspaceCredentials);

  const downloadItem = async ({ taskId, params, type }: RetryableTask) => {
    if (type === RetryableTaskType.Upload) {
      const data = {
        uploadFile: withFullName(params.filecontent),
        parentFolderId: params?.parentFolderId,
        taskId: getTaskId({ taskId, params }),
        fileType: params?.filecontent?.type ?? '',
      };
      RetryManager.changeStatus(getTaskId({ taskId, params }), RetryableTaskStatus.Retrying);
      try {
        await uploadRetryItem(data).unwrap();
      } catch {
        RetryManager.changeStatus(getTaskId({ taskId, params }), RetryableTaskStatus.Failed);
      }
    } else {
      RetryManager.changeStatus(taskId, RetryableTaskStatus.Retrying);
      try {
        await DownloadManager.downloadItem({
          payload: [params],
          selectedWorkspace,
          workspaceCredentials,
          taskId,
        });
      } finally {
        RetryManager.changeStatus(getTaskId({ taskId, params }), RetryableTaskStatus.Failed);
      }
    }
  };

  const retryableFiles = (files ?? []).filter(
    ({ status, retryable }) => status === RetryableTaskStatus.Failed && retryable !== false,
  );

  const retryAll = () => {
    retryableFiles.forEach((file) => {
      RetryManager.changeStatus(getTaskId(file), RetryableTaskStatus.Retrying);
    });

    const retryQueue = queue<RetryableTask>((file, next) => {
      QueueUtilsService.instance.adjustConcurrency(retryQueue, RETRY_ALL_CONCURRENCY);

      downloadItem(file)
        .then(() => next())
        .catch((error) => next(error));
    }, RETRY_ALL_CONCURRENCY);

    Promise.all(retryableFiles.map((file) => retryQueue.push(file))).catch((error) => errorService.reportError(error));
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="flex pb-5 justify-between items-center">
        <div className="flex items-center gap-3">
          <h4 data-testid="title-taskRetry" className="text-xl font-medium text-gray-100 ">
            {translate(
              files?.length > 0 && files[0].type === RetryableTaskType.Upload
                ? 'tasks.messages.failedToUpload'
                : 'tasks.messages.failedToDownload',
            )}
            {files?.length > 0 && ` (${files.length})`}
          </h4>
        </div>

        <div className="flex items-center gap-3">
          {retryableFiles.length > 0 && (
            <Button variant="primary" size="medium" onClick={retryAll} buttonDataCy="retry-all-taskRetry-button">
              <RestartIcon className="h-4 w-4" />
              <span>{translate('tasks.messages.retryAll')}</span>
            </Button>
          )}

          <button
            data-testid="close-taskRetry-button"
            className="flex h-9 w-9 items-center justify-center rounded-md hover:bg-highlight/4 active:bg-highlight/8"
            onClick={() => onClose()}
          >
            <X size={22} />
          </button>
        </div>
      </div>
      <div className="absolute top-[72px] left-0 w-full border-b border-gray-10" />

      {files?.length > 0 ? (
        <div className="pt-3 -mr-5">
          <List height={400} itemCount={files.length} itemSize={72} width={'100%'} itemData={{ files, downloadItem }}>
            {TaskToRetryItem}
          </List>
        </div>
      ) : (
        <span className="flex p-5 justify-between items-center" data-testid="finish-msg-taskRetry">
          {translate('tasks.messages.allProcessesHaveFinished')}.
        </span>
      )}
    </Modal>
  );
};

export default TaskToRetry;
