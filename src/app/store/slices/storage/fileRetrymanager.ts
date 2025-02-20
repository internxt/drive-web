import { UploadManagerFileParams } from 'app/network/UploadManager';

class FileRetryManager {
  private filesToRetry: UploadManagerFileParams[] = [];
  private listeners: (() => void)[] = [];

  addFile(file: UploadManagerFileParams) {
    this.filesToRetry.push(file);
    this.notify();
  }

  addFiles(files: UploadManagerFileParams[]) {
    this.filesToRetry.push(...files);
    this.notify();
  }

  clearFiles() {
    this.filesToRetry = [];
    this.notify();
  }

  getFiles() {
    return this.filesToRetry;
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
