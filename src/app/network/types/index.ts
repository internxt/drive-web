import { DownloadProgressCallback } from '../download';
import { FileKey } from './helper-types';

export interface LegacyShardMeta {
  hash: string;
  size: number;
  index: number;
  parity: boolean;
  challenges?: Buffer[];
  challenges_as_str: string[];
  tree: string[];
}

export interface DownloadOptions {
  key?: Buffer;
  token?: string;
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
  key: FileKey;
  chunkStart: number;
  chunkEnd: number;
  options?: DownloadOptions;
}

export type UploadErrorReason = 'connection-lost' | 'upload-failed';

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
