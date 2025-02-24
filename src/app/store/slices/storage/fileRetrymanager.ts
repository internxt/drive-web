import { UploadManagerFileParams } from 'app/network/UploadManager';

export type FileToRetry = {
  params: UploadManagerFileParams;
  status: 'uploading' | 'failed';
};

class FileRetryManager {
  private filesToRetry: FileToRetry[] = [];
  private listeners: (() => void)[] = [];

  addFile(file: UploadManagerFileParams) {
    this.filesToRetry.push({ params: file, status: 'failed' });
    this.notify();
  }

  addFiles(files: UploadManagerFileParams[]) {
    const filesWithStatus: FileToRetry[] = files.map((file) => ({
      params: file,
      status: 'failed',
    }));
    this.filesToRetry.push(...filesWithStatus);
    this.notify();
  }

  changeStatus(taskId: string, status: 'uploading' | 'failed') {
    this.filesToRetry = this.filesToRetry.map((file) => (file.params.taskId === taskId ? { ...file, status } : file));
    this.notify();
  }

  removeFile(taskId: string) {
    this.filesToRetry = this.filesToRetry.filter((file) => file.params.taskId !== taskId);
    this.notify();
  }

  clearFiles() {
    this.filesToRetry = [];
    this.notify();
  }

  getFiles() {
    return this.filesToRetry;
  }

  isRetryingFile(taskId: string): boolean {
    return this.filesToRetry.some((file) => file.params.taskId === taskId);
  }

  subscribe(listener: () => void) {
    this.listeners.push(listener);
  }

  unsubscribe(listener: () => void) {
    this.listeners = this.listeners.filter((l) => l !== listener);
  }

  private notify() {
    this.listeners.forEach((listener) => listener());
  }
}

const fileRetryManager = new FileRetryManager();
export default fileRetryManager;
