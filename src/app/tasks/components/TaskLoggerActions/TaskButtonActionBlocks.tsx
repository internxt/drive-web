import { t } from 'i18next';
import { ReactComponent as RestartIcon } from '../../../../assets/icons/tasklogger/circle-arrow.svg';
import { ReactComponent as Cross } from '../../../../assets/icons/tasklogger/cross.svg';
import { ReactComponent as DownloadIcon } from '../../../../assets/icons/tasklogger/download-icon.svg';
import { ReactComponent as ErrorIcon } from '../../../../assets/icons/tasklogger/error.svg';
import { ReactComponent as MagnifyingGlass } from '../../../../assets/icons/tasklogger/magnifying-glass.svg';
import { ReactComponent as Pause } from '../../../../assets/icons/tasklogger/pause.svg';
import { ReactComponent as Play } from '../../../../assets/icons/tasklogger/play.svg';
import { ReactComponent as Success } from '../../../../assets/icons/tasklogger/success-check.svg';
import { ReactComponent as UploadIcon } from '../../../../assets/icons/tasklogger/upload-icon.svg';
import { TaskLoggerButton } from '../TaskLoggerButton/TaskLoggerButton';

interface UploadingBlockProps {
  progressPercentage: string;
}

const UploadingBlock = ({ progressPercentage }: UploadingBlockProps): JSX.Element => {
  return (
    <div className="flex flex-row justify-between space-x-1.5">
      <div className="flex h-8 w-8 items-center justify-center">
        <span className="text-sm font-medium text-primary">{progressPercentage}%</span>
      </div>
      <div className="flex h-8 w-8 items-center justify-center">
        <UploadIcon height={20} width={20} />
      </div>
    </div>
  );
};

const DownloadingBlock = ({ progressPercentage }: UploadingBlockProps): JSX.Element => {
  return (
    <div className="flex flex-row justify-between space-x-1.5">
      <div className="flex h-8 w-8 items-center justify-center">
        <span className="text-sm font-medium text-primary">{progressPercentage}%</span>
      </div>
      <div className="flex h-8 w-8 items-center justify-center">
        <DownloadIcon height={20} width={20} />
      </div>
    </div>
  );
};

const PauseBlock = ({ isHovered, progress, cancelAction, isUploadTask, pauseAction, showPauseButton }): JSX.Element => {
  const InProgressItem = isUploadTask ? UploadingBlock : DownloadingBlock;

  return isHovered ? (
    <div className="flex flex-row justify-between space-x-1.5">
      <TaskLoggerButton onClick={cancelAction} Icon={Cross} />
      {isUploadTask && showPauseButton && <TaskLoggerButton onClick={pauseAction} Icon={Pause} />}
    </div>
  ) : (
    <InProgressItem progressPercentage={progress} />
  );
};

const PausedBlock = ({ isHovered, cancelAction, resumeAction }): JSX.Element => {
  return isHovered ? (
    <div className="flex flex-row justify-between space-x-1.5">
      <TaskLoggerButton onClick={cancelAction} Icon={Cross} />
      <TaskLoggerButton onClick={resumeAction} Icon={Play} />
    </div>
  ) : (
    <span className="text-sm font-medium text-gray-60">{t('tasks.paused')}</span>
  );
};

const PendingBlock = (): JSX.Element => {
  return <span className="text-sm font-medium text-gray-50">{t('tasks.waiting')}</span>;
};

const SuccessBlock = ({ isHovered, magnifyingAction, isUploadTask }): JSX.Element => {
  return isHovered && isUploadTask ? (
    <TaskLoggerButton onClick={magnifyingAction} Icon={MagnifyingGlass} />
  ) : (
    <div className="flex h-8 w-8 items-center justify-center">
      <Success width={20} height={20} />
    </div>
  );
};

const ErrorBlock = ({ isHovered, cancelAction, retryAction, displayRetry = true }): JSX.Element => {
  return isHovered ? (
    <div className="flex flex-row justify-between space-x-1.5">
      <TaskLoggerButton onClick={cancelAction} Icon={Cross} />
      {displayRetry && <TaskLoggerButton onClick={retryAction} Icon={RestartIcon} />}
    </div>
  ) : (
    <div className="flex h-8 w-8 items-center justify-center">
      <ErrorIcon width={20} height={20} />
    </div>
  );
};

export { ErrorBlock, PauseBlock, PausedBlock, PendingBlock, SuccessBlock };
