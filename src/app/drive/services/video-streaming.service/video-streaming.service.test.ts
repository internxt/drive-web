import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { ChunkRequestPayload, VideoStreamingService } from '.';
import { VideoStreamingSessionConfig } from './VideoStreamingSession';
import { VideoSessionDestroyedError } from '../errors/video-streaming.errors';

vi.mock('app/network/download/v2', () => ({
  downloadChunkFile: vi.fn(),
}));

vi.mock('services', () => ({
  binaryStreamToUint8Array: vi.fn(),
}));

import { downloadChunkFile } from 'app/network/download/v2';
import { binaryStreamToUint8Array } from 'services';

const createConfig = (): VideoStreamingSessionConfig => ({
  fileId: 'file-123',
  bucketId: 'bucket-456',
  fileSize: 1024000,
  fileType: 'video/mp4',
  mnemonic: 'test mnemonic',
  credentials: { user: 'user', pass: 'pass' },
});

describe('Video Streaming Service', () => {
  beforeEach(() => {
    vi.mocked(downloadChunkFile).mockResolvedValue(new ReadableStream());
    vi.mocked(binaryStreamToUint8Array).mockResolvedValue(new Uint8Array([1, 2, 3]));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Handling chunk requests', () => {
    test('When requesting a chunk, then calls downloadChunkFile with the correct parameters', async () => {
      const config = createConfig();
      const service = new VideoStreamingService(config);
      const request: ChunkRequestPayload = { start: 0, end: 1024 };

      await service.handleChunkRequest(request);

      expect(downloadChunkFile).toHaveBeenCalledWith(
        expect.objectContaining({
          bucketId: config.bucketId,
          fileId: config.fileId,
          mnemonic: config.mnemonic,
          chunkStart: 0,
          chunkEnd: 1024,
        }),
      );
    });

    test('When requesting the same chunk twice, then uses cache and downloads only once', async () => {
      const service = new VideoStreamingService(createConfig());
      const request: ChunkRequestPayload = { start: 0, end: 1024 };

      await service.handleChunkRequest(request);
      await service.handleChunkRequest(request);

      expect(downloadChunkFile).toHaveBeenCalledTimes(1);
    });

    test('When requesting different chunks, then downloads each one', async () => {
      const service = new VideoStreamingService(createConfig());

      await service.handleChunkRequest({ start: 0, end: 1024 });
      await service.handleChunkRequest({ start: 1024, end: 2048 });

      expect(downloadChunkFile).toHaveBeenCalledTimes(2);
    });

    test('When download fails, then propagates the error', async () => {
      vi.mocked(downloadChunkFile).mockRejectedValueOnce(new Error('Network error'));
      const service = new VideoStreamingService(createConfig());

      await expect(service.handleChunkRequest({ start: 0, end: 1024 })).rejects.toThrow('Network error');
    });
  });

  describe('Cleaning up', () => {
    test('When cleanup is called, then rejects subsequent requests', async () => {
      const service = new VideoStreamingService(createConfig());

      service.cleanup();

      await expect(service.handleChunkRequest({ start: 0, end: 1024 })).rejects.toThrow(VideoSessionDestroyedError);
    });

    test('When session is destroyed during download, then an error indicating so is thrown', async () => {
      const service = new VideoStreamingService(createConfig());

      vi.mocked(binaryStreamToUint8Array).mockImplementation(async () => {
        service.cleanup();
        return new Uint8Array([1, 2, 3]);
      });

      await expect(service.handleChunkRequest({ start: 0, end: 1024 })).rejects.toThrow(VideoSessionDestroyedError);
    });
  });
});
