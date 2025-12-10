import { downloadChunkFile } from 'app/network/download/v2';
import { binaryStreamToUint8Array } from 'services/stream.service';
import { getVideoMimeType } from 'services';
import { VideoStreamingService, ChunkRequestPayload } from './index';

export interface VideoStreamingSessionConfig {
  fileId: string;
  bucketId: string;
  fileSize: number;
  fileType: string;
  mnemonic: string;
  credentials: {
    user: string;
    pass: string;
  };
  onProgress?: (progress: number) => void;
}

const CACHE_SIZE_LIMIT = 20;

export class VideoStreamingSession {
  private service: VideoStreamingService | null = null;
  private abortController = new AbortController();
  private chunkCache = new Map<string, Uint8Array>();
  private pendingRequests = new Map<string, Promise<Uint8Array>>();
  private isDestroyed = false;
  private videoUrl: string | null = null;

  constructor(private readonly config: VideoStreamingSessionConfig) {}

  async init(): Promise<boolean> {
    if (this.isDestroyed) {
      return false;
    }

    const service = new VideoStreamingService(
      {
        fileSize: this.config.fileSize,
        mimeType: getVideoMimeType(this.config.fileType),
      },
      this.handleChunkRequest.bind(this),
    );

    this.service = service;

    await service.init();

    if (this.isDestroyed) {
      return false;
    }

    this.videoUrl = service.getVideoUrl();
    return true;
  }

  getVideoUrl(): string | null {
    return this.videoUrl;
  }

  destroy(): void {
    if (this.isDestroyed) {
      return;
    }

    this.isDestroyed = true;

    this.abortController.abort();

    this.chunkCache.clear();
    this.pendingRequests.clear();

    if (this.service) {
      this.service.destroy().catch((error) => {
        console.error('[VideoStreamingSession] Error destroying service:', error);
      });
      this.service = null;
    }
  }

  private async handleChunkRequest(request: ChunkRequestPayload): Promise<Uint8Array> {
    if (this.isDestroyed) {
      throw new Error('Session destroyed');
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

      const result = await binaryStreamToUint8Array(stream, (bytes) => {
        const progress = bytes / (end - start);
        if (this.chunkCache.size === 0 && this.config.onProgress) {
          const currentProgress = progress >= 1 ? 0.95 : progress;
          this.config.onProgress(currentProgress);
        }
      });

      if (this.isDestroyed) {
        throw new Error('Session destroyed during download');
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
}
