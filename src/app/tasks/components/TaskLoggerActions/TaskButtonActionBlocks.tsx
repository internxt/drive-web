import UploadIcon from '../../../../assets/icons/tasklogger/upload-icon.svg?react';
import DownloadIcon from '../../../../assets/icons/tasklogger/download-icon.svg?react';
import Cross from '../../../../assets/icons/tasklogger/cross.svg?react';
import Pause from '../../../../assets/icons/tasklogger/pause.svg?react';
import Play from '../../../../assets/icons/tasklogger/play.svg?react';
import Success from '../../../../assets/icons/tasklogger/success-check.svg?react';
import ErrorIcon from '../../../../assets/icons/tasklogger/error.svg?react';
import MagnifyingGlass from '../../../../assets/icons/tasklogger/magnifying-glass.svg?react';
import InfoIcon from '../../../../assets/icons/tasklogger/info.svg?react';
import RestartIcon from '../../../../assets/icons/tasklogger/circle-arrow.svg?react';
import WarningIcon from '../../../../assets/icons/tasklogger/warning.svg?react';
import { TaskLoggerButton } from '../TaskLoggerButton/TaskLoggerButton';
import { t } from 'i18next';
import { bytesToString } from 'app/drive/services/size.service';

interface UploadingBlockProps {
  progressPercentage: string;
  downloadedProgress?: number;
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

const DownloadingBlock = ({ progressPercentage, downloadedProgress }: UploadingBlockProps): JSX.Element => {
  return (
    <div className="flex flex-row justify-between space-x-1.5">
      <div className="flex h-8 w-10 items-center justify-center">
        <span className="text-sm font-medium text-primary">
          {downloadedProgress ? `${bytesToString(downloadedProgress)}` : `${progressPercentage}%`}
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
  cancelAction,
  downloadedProgress,
  taskType,
  pauseAction,
  showPauseButton,
}): JSX.Element => {
  const InProgressItem = taskType.includes('upload') ? UploadingBlock : DownloadingBlock;

  return isHovered ? (
    <div className="flex flex-row justify-between space-x-1.5">
      <TaskLoggerButton onClick={cancelAction} Icon={Cross} />
      {taskType.includes('upload') && showPauseButton && <TaskLoggerButton onClick={pauseAction} Icon={Pause} />}
    </div>
  ) : (
    <InProgressItem progressPercentage={progress} downloadedProgress={downloadedProgress} />
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

const SuccessBlock = ({ isHovered, magnifyingAction, infoAction, taskType, haveWarnings }): JSX.Element => {
  if (isHovered && taskType.includes('upload')) {
    return (
      <>
        {haveWarnings && <TaskLoggerButton onClick={infoAction} Icon={InfoIcon} />}
        <TaskLoggerButton onClick={magnifyingAction} Icon={MagnifyingGlass} />
      </>
    );
  } else if (isHovered && taskType.includes('download')) {
    return <>{haveWarnings && <TaskLoggerButton onClick={infoAction} Icon={InfoIcon} />}</>;
  } else {
    return (
      <div className="flex h-8 w-8 items-center justify-center">
        {haveWarnings ? <WarningIcon width={20} height={20} /> : <Success width={20} height={20} />}
      </div>
    );
  }
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
