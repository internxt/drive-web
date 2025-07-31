export interface IUploadParams {
  filesize: number;
  filecontent: File;
  isUploadedFromFolder?: boolean;
  progressCallback: ProgressCallback;
}

export type ProgressCallback = (progress: number, uploadedBytes: number | null, totalBytes: number | null) => void;

export interface EnvironmentConfig {
  bridgeUser: string;
  bridgePass: string;
  encryptionKey: string;
  bucketId: string;
  useProxy: boolean;
}
