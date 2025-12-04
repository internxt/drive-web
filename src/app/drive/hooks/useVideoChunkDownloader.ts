import { useCallback } from 'react';
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
}

const CACHE_SIZE_LIMIT = 20;

export function useVideoChunkDownloader(config: VideoChunkDownloaderConfig) {
  const chunkCacheRef = new Map();
  const pendingRequestsRef = new Map();

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

      const result = await binaryStreamToUint8Array(stream);

      if (chunkCacheRef.size > CACHE_SIZE_LIMIT) {
        const firstKey = chunkCacheRef.keys().next().value;
        if (firstKey) chunkCacheRef.delete(firstKey);
      }
      chunkCacheRef.set(cacheKey, result);
      pendingRequestsRef.delete(cacheKey);

      return result;
    },
    [config.bucketId, config.fileId, config.mnemonic, config.credentials],
  );

  const handleChunkRequest = useCallback(
    async (request: ChunkRequestPayload): Promise<Uint8Array> => {
      const { start, end } = request;
      const cacheKey = `${start}-${end}`;

      // Return from cache if available
      const cached = chunkCacheRef.get(cacheKey);
      if (cached) return cached;

      // Wait for pending request if exists
      const pending = pendingRequestsRef.get(cacheKey);
      if (pending) return pending;

      // Create new download request
      const downloadPromise = downloadAndCombineChunk(start, end, cacheKey);

      pendingRequestsRef.set(cacheKey, downloadPromise);
      return downloadPromise;
    },
    [downloadAndCombineChunk],
  );

  return { handleChunkRequest };
}
