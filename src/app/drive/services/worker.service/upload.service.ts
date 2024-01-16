import { TaskStatus } from '../../../tasks/types';

async function waitForContiueUploadSignal(taskId: string): Promise<void> {
  return new Promise((resolve) => {
    const checkProgress = async () => {
      let beginProgress = false;
      const handleMessage = (msg: MessageEvent) => {
        if (msg.data.result === 'uploadStatus') {
          if (taskId === msg.data.uploadStatus.taskId) {
            beginProgress = msg.data.uploadStatus.status === TaskStatus.InProcess;
          }
        }
      };

      addEventListener('message', handleMessage);
      while (!beginProgress) {
        postMessage({ result: 'checkUploadStatus' });
        await new Promise((timeoutResolve) => setTimeout(timeoutResolve, 1000));
      }

      removeEventListener('message', handleMessage);
      resolve();
    };

    checkProgress();
  });
}

export { waitForContiueUploadSignal };
