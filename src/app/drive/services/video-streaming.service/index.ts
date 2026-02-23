import { downloadChunkFile } from 'app/network/download/v2';
import { binaryStreamToUint8Array } from 'services';
import { VideoSessionDestroyedError } from '../errors/video-streaming.errors';
import { VideoStreamingSessionConfig } from './VideoStreamingSession';

export interface VideoStreamSession {
  fileSize: number;
  mimeType: string;
}

export interface ChunkRequestPayload {
  start: number;
  end: number;
}

const CACHE_SIZE_LIMIT = 20;

export class VideoStreamingService {
  private readonly abortController = new AbortController();
  private readonly chunkCache = new Map<string, Uint8Array>();
  private readonly pendingRequests = new Map<string, Promise<Uint8Array>>();
  private isDestroyed = false;

  constructor(private readonly config: VideoStreamingSessionConfig) {}

  async handleChunkRequest(request: ChunkRequestPayload): Promise<Uint8Array> {
    if (this.isDestroyed) {
      throw new VideoSessionDestroyedError('Session destroyed during requesting the chunk');
    }

    const { start, end } = request;
    const cacheKey = `${start}-${end}`;

    const cached = this.chunkCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const pending = this.pendingRequests.get(cacheKey);
    if (pending) {
      return pending;
    }

    const downloadPromise = this.downloadChunk(start, end, cacheKey);
    this.pendingRequests.set(cacheKey, downloadPromise);

    return downloadPromise;
  }

  private async downloadChunk(start: number, end: number, cacheKey: string): Promise<Uint8Array> {
    try {
      const stream = await downloadChunkFile({
        bucketId: this.config.bucketId,
        fileId: this.config.fileId,
        mnemonic: this.config.mnemonic,
        creds: this.config.credentials,
        chunkStart: start,
        chunkEnd: end,
        options: {
          notifyProgress: () => {},
          abortController: this.abortController,
        },
      });

      const result = await binaryStreamToUint8Array(stream);

      if (this.isDestroyed) {
        throw new VideoSessionDestroyedError('Session destroyed during download');
      }

      if (this.chunkCache.size > CACHE_SIZE_LIMIT) {
        const firstKey = this.chunkCache.keys().next().value;
        if (firstKey) {
          this.chunkCache.delete(firstKey);
        }
      }

      this.chunkCache.set(cacheKey, result);
      this.pendingRequests.delete(cacheKey);

      return result;
    } catch (error) {
      this.pendingRequests.delete(cacheKey);
      throw error;
    }
  }

  cleanup(): void {
    this.isDestroyed = true;
    this.abortController.abort();
    this.chunkCache.clear();
    this.pendingRequests.clear();
  }
}
