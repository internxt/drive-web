export enum TaskStatus {
  Pending = 'pending',
  Encrypting = 'encrypting',
  Decrypting = 'decrypting',
  InProcess = 'in-process',
  Error = 'error',
  Success = 'success',
  Cancelled = 'cancelled',
}

export enum TaskType {
  CreateFolder = 'create-folder',
  DownloadFile = 'download-file',
  DownloadFolder = 'download-folder',
  DownloadBackup = 'download-backup',
  UploadFile = 'upload-file',
  UploadFolder = 'upload-folder',
  MoveFile = 'move-file',
  MoveFolder = 'move-folder',
}

export enum TaskProgress {
  Min = 0.0,
  Max = 1.0,
}

export enum TaskManagerEvent {
  TaskAdded = 'task-added',
  TaskUpdated = 'task-updated',
  TaskCompleted = 'task-completed',
  TaskCancelled = 'task-cancelled',
}
