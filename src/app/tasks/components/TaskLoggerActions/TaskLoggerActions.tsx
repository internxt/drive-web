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
  isHovered: boolean;
  status: string;
  progress: string;
  cancelAction: () => void;
  retryAction: () => void;
  isUploadTask: boolean;
};

export const TaskLoggerActions = ({
  isHovered,
  status,
  progress,
  cancelAction,
  retryAction,
  isUploadTask,
}: TaskLoggerActionsProps) => {
  const Action = ITEM_DEPEND_STATUS[status] ?? (() => <></>);

  return (
    <Action
      isHovered={isHovered}
      progress={progress}
      cancelAction={cancelAction}
      retryAction={retryAction}
      isUploadTask={isUploadTask}
    />
  );
};
