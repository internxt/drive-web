import { Modal } from '@internxt/ui';
import { RootState } from 'app/store';
import { useEffect } from 'react';
import { useSelector } from 'react-redux';

const TaskToRetry = (): JSX.Element => {
  const filesToRetry = useSelector((state: RootState) => state.storage.filesToRetryUpload);

  /*useEffect(() => {
    console.log('filesToRetryUpload ha cambiado:', filesToRetry);
  }, [filesToRetry]);*/

  return (
    <Modal isOpen={true} onClose={() => {}}>
      <div>
        <h2>Archivos a Reintentar</h2>
        <ul>
          {filesToRetry.map((file, index) => (
            <li key={index}>{file.filecontent.name}</li>
          ))}
        </ul>
      </div>
    </Modal>
  );
};

export default TaskToRetry;
