import localStorageService from '../../../core/services/local-storage.service';
import tasksService from '../../services/tasks.service';
import { TaskStatus } from '../../types';
import { ErrorBlock, PauseBlock, PausedBlock, PendingBlock, SuccessBlock } from './TaskButtonActionBlocks';

const ITEM_DEPEND_STATUS = {
  [TaskStatus.InProcess]: PauseBlock,
  [TaskStatus.Pending]: PendingBlock,
  [TaskStatus.Encrypting]: PendingBlock,
  [TaskStatus.Paused]: PausedBlock,
  [TaskStatus.Success]: SuccessBlock,
  [TaskStatus.Error]: ErrorBlock,
};

type TaskLoggerActionsProps = {
  taskId: string;
  isHovered: boolean;
  status: string;
  progress: string;
  cancelAction: () => void;
  retryAction: () => void;
  isUploadTask: boolean;
  openItemAction: () => void;
};

const pauseUpload = (id: string) => {
  localStorageService.setUploadState(id, TaskStatus.Paused);
  tasksService.updateTask({
    taskId: id,
    merge: { status: TaskStatus.Paused },
  });
};

const resumeUpload = (id: string) => {
  localStorageService.setUploadState(id, TaskStatus.InProcess);
  tasksService.updateTask({
    taskId: id,
    merge: { status: TaskStatus.InProcess },
  });
};

const removeUpload = (id: string) => {
  localStorageService.removeUploadState(id);
};

export const TaskLoggerActions = ({
  taskId,
  isHovered,
  status,
  progress,
  cancelAction,
  retryAction,
  isUploadTask,
  openItemAction,
}: TaskLoggerActionsProps) => {
  const Action = ITEM_DEPEND_STATUS[status] ?? (() => <></>);

  return (
    <Action
      isHovered={isHovered}
      progress={progress}
      cancelAction={() => {
        cancelAction();
        removeUpload(taskId);
      }}
      retryAction={retryAction}
      pauseAction={() => pauseUpload(taskId)}
      resumeAction={() => {
        resumeUpload(taskId);
      }}
      magnifyingAction={openItemAction}
      isUploadTask={isUploadTask}
    />
  );
};
