import { useCallback, useRef } from 'react';
import { downloadChunkFile } from 'app/network/download/v2';
import { binaryStreamToUint8Array } from 'services/stream.service';
import { ChunkRequestPayload } from '../services/video-streaming.service';

interface VideoChunkDownloaderConfig {
  bucketId: string;
  fileId: string;
  mnemonic: string;
  credentials: {
    user: string;
    pass: string;
  };
  handleProgress?: (progress: number) => void;
}

const CACHE_SIZE_LIMIT = 20;

export function useVideoChunkDownloader(config: VideoChunkDownloaderConfig) {
  const chunkCache = useRef(new Map<string, Uint8Array>()).current;
  const pendingRequests = useRef(new Map<string, Promise<Uint8Array>>()).current;

  const downloadAndCombineChunk = useCallback(
    async (start: number, end: number, cacheKey: string): Promise<Uint8Array> => {
      const stream = await downloadChunkFile({
        bucketId: config.bucketId,
        fileId: config.fileId,
        mnemonic: config.mnemonic,
        creds: config.credentials,
        chunkStart: start,
        chunkEnd: end,
        options: { notifyProgress: () => {} },
      });

      const result = await binaryStreamToUint8Array(stream, (bytes) => {
        const progress = bytes / (end - start);
        if (chunkCache.size === 0 && config.handleProgress) {
          const currentProgress = progress >= 1 ? 0.95 : progress;
          console.log('PROGRESS', currentProgress);
          config.handleProgress(currentProgress);
        }
      });

      if (chunkCache.size > CACHE_SIZE_LIMIT) {
        const firstKey = chunkCache.keys().next().value;
        if (firstKey) chunkCache.delete(firstKey);
      }
      chunkCache.set(cacheKey, result);
      pendingRequests.delete(cacheKey);

      return result;
    },
    [config.bucketId, config.fileId, config.mnemonic, config.credentials, config.handleProgress],
  );

  const handleChunkRequest = useCallback(
    async (request: ChunkRequestPayload): Promise<Uint8Array> => {
      const { start, end } = request;
      const cacheKey = `${start}-${end}`;

      const cached = chunkCache.get(cacheKey);
      if (cached) return cached;

      const pending = pendingRequests.get(cacheKey);
      if (pending) return pending;

      const downloadPromise = downloadAndCombineChunk(start, end, cacheKey);

      pendingRequests.set(cacheKey, downloadPromise);
      return downloadPromise;
    },
    [downloadAndCombineChunk],
  );

  return { handleChunkRequest };
}
