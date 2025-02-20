import { X } from '@phosphor-icons/react';
import { UploadManagerFileParams } from 'app/network/UploadManager';
import Modal from 'app/shared/components/Modal';
import fileRetryManager from 'app/store/slices/storage/fileRetrymanager';
import { useReduxActions } from 'app/store/slices/storage/hooks/useReduxActions';
import { useEffect, useState } from 'react';
import { FixedSizeList as List } from 'react-window';
import TaskToRetryItem from '../TaskToRetryItem/TaskToRetryItem';

interface TaskToRetryProps {
  isOpen: boolean;
  onClose: () => void;
}

const TaskToRetry = ({ isOpen, onClose }: TaskToRetryProps): JSX.Element => {
  const [filesToRetry, setFilesToRetry] = useState(fileRetryManager.getFiles());
  const { uploadRetryItem } = useReduxActions();

  useEffect(() => {
    const handleUpdate = () => setFilesToRetry([...fileRetryManager.getFiles()]);
    fileRetryManager.subscribe(handleUpdate);
    return () => fileRetryManager.unsubscribe(handleUpdate);
  }, []);

  const downloadItem = (fileParams: UploadManagerFileParams) => {
    const data = {
      uploadFile: fileParams.filecontent.content,
      parentFolderId: fileParams.parentFolderId,
      taskId: fileParams.taskId ?? '',
      fileType: fileParams.filecontent.type ?? '',
    };
    uploadRetryItem(data);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="flex pb-5 justify-between items-center">
        <h4 className="text-xl font-medium text-gray-100 ">Failed to upload</h4>

        <button
          className="flex h-9 w-9 items-center justify-center rounded-md hover:bg-highlight/4 active:bg-highlight/8"
          onClick={() => onClose()}
        >
          <X size={22} />
        </button>
      </div>
      <div className="absolute top-[72px] left-0 w-full border-b border-gray-10" />

      <List
        height={400}
        itemCount={filesToRetry.length}
        itemSize={72}
        width={'100%'}
        itemData={{ files: filesToRetry, downloadItem }}
      >
        {TaskToRetryItem}
      </List>
    </Modal>
  );
};

export default TaskToRetry;
