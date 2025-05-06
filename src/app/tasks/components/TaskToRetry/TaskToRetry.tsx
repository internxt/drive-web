import { X } from '@phosphor-icons/react';
import { useReduxActions } from 'app/store/slices/storage/hooks/useReduxActions';
import { FixedSizeList as List } from 'react-window';
import TaskToRetryItem from '../TaskToRetryItem/TaskToRetryItem';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import RetryManager, { RetryableTask } from '../../../network/RetryManager';
import { Modal } from '@internxt/ui';
import { DownloadManager } from '../../../network/DownloadManager';
import { useAppSelector } from '../../../store/hooks';
import workspacesSelectors from '../../../store/slices/workspaces/workspaces.selectors';

interface TaskToRetryProps {
  isOpen: boolean;
  files: RetryableTask[];
  onClose: () => void;
}

const TaskToRetry = ({ isOpen, files, onClose }: TaskToRetryProps): JSX.Element => {
  const { uploadRetryItem } = useReduxActions();
  const { translate } = useTranslationContext();
  const selectedWorkspace = useAppSelector(workspacesSelectors.getSelectedWorkspace);
  const workspaceCredentials = useAppSelector(workspacesSelectors.getWorkspaceCredentials);

  const downloadItem = async ({ taskId, params, type }: RetryableTask) => {
    if (type == 'upload') {
      const data = {
        uploadFile: params?.filecontent?.content,
        parentFolderId: params?.parentFolderId,
        taskId: taskId ?? params?.taskId ?? '',
        fileType: params?.filecontent?.type ?? '',
      };
      RetryManager.changeStatus(taskId ?? params?.taskId ?? '', 'retrying');
      try {
        uploadRetryItem(data);
      } catch {
        RetryManager.changeStatus(taskId ?? params?.taskId ?? '', 'failed');
      }
    } else {
      RetryManager.changeStatus(taskId, 'retrying');
      try {
        await DownloadManager.downloadItem({
          payload: [params],
          selectedWorkspace,
          workspaceCredentials,
          taskId,
        });
      } catch {
        RetryManager.changeStatus(taskId ?? params?.taskId ?? '', 'failed');
      }
    }
    RetryManager.changeStatus(taskId ?? params?.taskId ?? '', 'failed');
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="flex pb-5 justify-between items-center">
        <h4 data-testid="title-taskRetry" className="text-xl font-medium text-gray-100 ">
          {translate(
            files?.length > 0 && files[0].type === 'upload'
              ? 'tasks.messages.failedToUpload'
              : 'tasks.messages.failedToDownload',
          )}
        </h4>

        <button
          data-testid="close-taskRetry-button"
          className="flex h-9 w-9 items-center justify-center rounded-md hover:bg-highlight/4 active:bg-highlight/8"
          onClick={() => onClose()}
        >
          <X size={22} />
        </button>
      </div>
      <div className="absolute top-[72px] left-0 w-full border-b border-gray-10" />

      {files?.length > 0 ? (
        <List height={400} itemCount={files.length} itemSize={72} width={'100%'} itemData={{ files, downloadItem }}>
          {TaskToRetryItem}
        </List>
      ) : (
        <span className="flex p-5 justify-between items-center" data-testid="finish-msg-taskRetry">
          {translate('tasks.messages.allProcessesHaveFinished')}.
        </span>
      )}
    </Modal>
  );
};

export default TaskToRetry;
