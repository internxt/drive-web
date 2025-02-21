import { X } from '@phosphor-icons/react';
import { UploadManagerFileParams } from 'app/network/UploadManager';
import Modal from 'app/shared/components/Modal';
import { useReduxActions } from 'app/store/slices/storage/hooks/useReduxActions';
import { FixedSizeList as List } from 'react-window';
import TaskToRetryItem from '../TaskToRetryItem/TaskToRetryItem';
import fileRetryManager, { FileToRetry } from 'app/store/slices/storage/fileRetrymanager';

interface TaskToRetryProps {
  isOpen: boolean;
  files: FileToRetry[];
  onClose: () => void;
}

const TaskToRetry = ({ isOpen, files, onClose }: TaskToRetryProps): JSX.Element => {
  const { uploadRetryItem } = useReduxActions();

  const downloadItem = (fileParams: FileToRetry) => {
    const data = {
      uploadFile: fileParams.params.filecontent.content,
      parentFolderId: fileParams.params.parentFolderId,
      taskId: fileParams.params.taskId ?? '',
      fileType: fileParams.params.filecontent.type ?? '',
    };
    fileRetryManager.changeStatus(fileParams.params.taskId ?? '', 'uploading');
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

      <List height={400} itemCount={files.length} itemSize={72} width={'100%'} itemData={{ files, downloadItem }}>
        {TaskToRetryItem}
      </List>
    </Modal>
  );
};

export default TaskToRetry;
