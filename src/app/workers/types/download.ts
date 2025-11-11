import { DriveFileData } from 'app/drive/types';

export interface DownloadFilePayload {
  file: DriveFileData;
  isWorkspace: boolean;
  credentials: any;
}

export interface DownloadFileCallback {
  onProgress: (progress: number) => void;
  onSuccess: (fileId: string) => void;
  onError: (error: any) => void;
  onChunk: (chunk: Uint8Array) => void;
}
