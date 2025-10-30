import { DownloadProgressCallback } from '../download';

export interface LegacyShardMeta {
  hash: string;
  size: number;
  index: number;
  parity: boolean;
  challenges?: Buffer[];
  challenges_as_str: string[];
  tree: string[];
}

export type ShardMeta = Omit<LegacyShardMeta, 'challenges' | 'challenges_as_str' | 'tree'>;

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
  mnemonic: string;
  chunkStart: number;
  chunkEnd: number;
  options?: DownloadOptions;
}
