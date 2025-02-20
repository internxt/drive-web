import { Button } from '@internxt/ui';
import { UploadManagerFileParams } from 'app/network/UploadManager';
import Modal from 'app/shared/components/Modal';
import fileRetryManager from 'app/store/slices/storage/fileRetrymanager';
import { useReduxActions } from 'app/store/slices/storage/hooks/useReduxActions';
import { useEffect, useState } from 'react';

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
      <div>
        <Button onClick={() => {}}>Cerrar</Button>
        <h2>Archivos a Reintentar</h2>
        <ul>
          {filesToRetry.map((file, index) => (
            <li key={index}>
              {file.filecontent.name}
              <Button onClick={() => downloadItem(file)}>Reintentar</Button>
            </li>
          ))}
        </ul>
      </div>
    </Modal>
  );
};

export default TaskToRetry;
