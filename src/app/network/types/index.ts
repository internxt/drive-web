import { DownloadProgressCallback } from '../download';

export interface DownloadOptions {
  key?: Buffer;
  token?: string;
  bucketKey?: Buffer;
  abortController?: AbortController;
  downloadingCallback?: DownloadProgressCallback;
}

export interface DownloadChunkTask {
  index: number;
  chunkStart: number;
  chunkEnd: number;
  attempt: number;
  maxRetries: number;
}

export interface DownloadChunkPayload {
  bucketId: string;
  fileId: string;
  mnemonic: string;
  chunkStart: number;
  chunkEnd: number;
  options?: DownloadOptions;
}

export interface OwnerUserAuthenticationData {
  token: string;
  bridgeUser: string;
  bridgePass: string;
  encryptionKey: string;
  bucketId: string;
  // to manage B2B workspaces
  workspaceId?: string;
  workspacesToken?: string;
  resourcesToken?: string;
}
