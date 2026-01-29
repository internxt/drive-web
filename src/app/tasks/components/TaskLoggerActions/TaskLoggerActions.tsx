import DatabaseUploadRepository from '../../../repositories/DatabaseUploadRepository';
import tasksService from '../../services/tasks.service';
import { TaskStatus, TaskType } from '../../types';
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
  downloadedProgress?: number;
  cancelAction: () => void;
  retryAction: () => void;
  taskType: TaskType;
  openItemAction: () => void;
  openRetryItemsAction: () => void;
  showPauseButton: boolean;
  haveWarnings: boolean;
};

const pauseUpload = async (id: string) => {
  const uploadRespository = DatabaseUploadRepository.getInstance();
  await uploadRespository.setUploadState(id, TaskStatus.Paused);

  tasksService.updateTask({
    taskId: id,
    merge: { status: TaskStatus.Paused },
  });
};

const resumeUpload = async (id: string) => {
  const uploadRespository = DatabaseUploadRepository.getInstance();
  await uploadRespository.setUploadState(id, TaskStatus.InProcess);

  tasksService.updateTask({
    taskId: id,
    merge: { status: TaskStatus.InProcess },
  });
};

const removeUpload = async (id: string) => {
  const uploadRespository = DatabaseUploadRepository.getInstance();
  await uploadRespository.removeUploadState(id);
};

export const TaskLoggerActions = ({
  taskId,
  isHovered,
  status,
  progress,
  downloadedProgress,
  cancelAction,
  retryAction,
  taskType,
  openItemAction,
  openRetryItemsAction,
  showPauseButton,
  haveWarnings,
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
      downloadedProgress={downloadedProgress}
      magnifyingAction={openItemAction}
      infoAction={openRetryItemsAction}
      taskType={taskType}
      showPauseButton={showPauseButton}
      haveWarnings={haveWarnings}
    />
  );
};
