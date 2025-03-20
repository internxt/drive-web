import { ReactComponent as UploadIcon } from '../../../../assets/icons/tasklogger/upload-icon.svg';
import { ReactComponent as DownloadIcon } from '../../../../assets/icons/tasklogger/download-icon.svg';
import { ReactComponent as Cross } from '../../../../assets/icons/tasklogger/cross.svg';
import { ReactComponent as Pause } from '../../../../assets/icons/tasklogger/pause.svg';
import { ReactComponent as Play } from '../../../../assets/icons/tasklogger/play.svg';
import { ReactComponent as Success } from '../../../../assets/icons/tasklogger/success-check.svg';
import { ReactComponent as ErrorIcon } from '../../../../assets/icons/tasklogger/error.svg';
import { ReactComponent as MagnifyingGlass } from '../../../../assets/icons/tasklogger/magnifying-glass.svg';
import { ReactComponent as InfoIcon } from '../../../../assets/icons/tasklogger/info.svg';
import { ReactComponent as RestartIcon } from '../../../../assets/icons/tasklogger/circle-arrow.svg';
import { ReactComponent as WarningIcon } from '../../../../assets/icons/tasklogger/warning.svg';
import { TaskLoggerButton } from '../TaskLoggerButton/TaskLoggerButton';
import { t } from 'i18next';

interface UploadingBlockProps {
  progressPercentage: string;
  nItems: string;
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

const DownloadingBlock = ({ progressPercentage, nItems }: UploadingBlockProps): JSX.Element => {
  return (
    <div className="flex flex-row justify-between space-x-1.5">
      <div className="flex h-8 w-8 items-center justify-center">
        <span className="text-sm font-medium text-primary">
          {nItems && +nItems > 0 ? `${nItems}` : `${progressPercentage}%`}
        </span>
      </div>
      <div className="flex h-8 w-8 items-center justify-center">
        <DownloadIcon height={20} width={20} />
      </div>
    </div>
  );
};

const PauseBlock = ({
  isHovered,
  progress,
  nItems,
  cancelAction,
  isUploadTask,
  pauseAction,
  showPauseButton,
}): JSX.Element => {
  const InProgressItem = isUploadTask ? UploadingBlock : DownloadingBlock;

  return isHovered ? (
    <div className="flex flex-row justify-between space-x-1.5">
      <TaskLoggerButton onClick={cancelAction} Icon={Cross} />
      {isUploadTask && showPauseButton && <TaskLoggerButton onClick={pauseAction} Icon={Pause} />}
    </div>
  ) : (
    <InProgressItem progressPercentage={progress} nItems={nItems} />
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

const SuccessBlock = ({ isHovered, magnifyingAction, infoAction, isUploadTask, haveWarnings }): JSX.Element => {
  return isHovered && isUploadTask ? (
    <>
      {haveWarnings && <TaskLoggerButton onClick={infoAction} Icon={InfoIcon} />}
      <TaskLoggerButton onClick={magnifyingAction} Icon={MagnifyingGlass} />
    </>
  ) : (
    <div className="flex h-8 w-8 items-center justify-center">
      {haveWarnings ? <WarningIcon width={20} height={20} /> : <Success width={20} height={20} />}
    </div>
  );
};

const ErrorBlock = ({ isHovered, cancelAction, retryAction }): JSX.Element => {
  return isHovered ? (
    <div className="flex flex-row justify-between space-x-1.5">
      <TaskLoggerButton onClick={cancelAction} Icon={Cross} />
      <TaskLoggerButton onClick={retryAction} Icon={RestartIcon} />
    </div>
  ) : (
    <div className="flex h-8 w-8 items-center justify-center">
      <ErrorIcon width={20} height={20} />
    </div>
  );
};

export { PauseBlock, PausedBlock, PendingBlock, SuccessBlock, ErrorBlock };
