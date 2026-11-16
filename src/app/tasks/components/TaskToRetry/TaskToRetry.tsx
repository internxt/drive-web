import { X } from '@phosphor-icons/react';
import { FixedSizeList as List } from 'react-window';
import TaskToRetryItem, { FailedItemToRetry } from '../TaskToRetryItem/TaskToRetryItem';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import { Button, Modal } from '@internxt/ui';
import RestartIcon from '../../../../assets/icons/tasklogger/circle-arrow.svg?react';

interface TaskToRetryProps {
  isOpen: boolean;
  failedItems: FailedItemToRetry[];
  isUpload: boolean;
  onClose: () => void;
  onRetryAll?: () => void;
}

const canBeRetried = (failedItem: FailedItemToRetry) => failedItem.isRetryable && !failedItem.isRetrying;

const TaskToRetry = ({ isOpen, failedItems, isUpload, onClose, onRetryAll }: TaskToRetryProps): JSX.Element => {
  const { translate } = useTranslationContext();

  const failedItemsToRetry = failedItems.filter(canBeRetried);
  const hasFailedItems = failedItems.length > 0;
  const hasFailedItemsToRetry = failedItemsToRetry.length > 0;

  const retryAll = onRetryAll ?? (() => failedItemsToRetry.forEach((failedItem) => failedItem.retry()));

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="flex pb-5 justify-between items-center">
        <div className="flex items-center gap-3">
          <h4 data-testid="title-taskRetry" className="text-xl font-medium text-gray-100 ">
            {translate(isUpload ? 'tasks.messages.failedToUpload' : 'tasks.messages.failedToDownload')}
            {hasFailedItems && ` (${failedItems.length})`}
          </h4>
        </div>

        <div className="flex items-center gap-3">
          {hasFailedItemsToRetry && (
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

      {hasFailedItems ? (
        <div className="pt-3 -mr-5">
          <List height={400} itemCount={failedItems.length} itemSize={72} width={'100%'} itemData={{ failedItems }}>
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
