import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import Resizer from 'react-image-file-resizer';
import { ErrorLoadingVideoFileError } from './errors/thumbnail.service.errors';
import { getVideoFrame, getImageThumbnail, downloadThumbnail } from './thumbnail.service';
import localStorageService from 'services/local-storage.service';
import fetchFileBlob from './download.service/fetchFileBlob';
import { Thumbnail } from '@internxt/sdk/dist/drive/storage/types';

vi.mock('react-image-file-resizer');
vi.mock('services/local-storage.service');
vi.mock('./download.service/fetchFileBlob');

const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0));

const createMockVideoElement = (options: { duration?: number; videoWidth?: number; videoHeight?: number } = {}) => {
  const { duration = 10, videoWidth = 1920, videoHeight = 1080 } = options;

  const listeners: Record<string, ((event?: Event) => void)[]> = {};

  return {
    duration,
    videoWidth,
    videoHeight,
    currentTime: 0,
    src: '',
    setAttribute: vi.fn(),
    load: vi.fn(),
    addEventListener: vi.fn((event: string, callback: (event?: Event) => void) => {
      if (!listeners[event]) {
        listeners[event] = [];
      }
      listeners[event].push(callback);
    }),
    trigger: (event: string, eventObj?: Event) => {
      listeners[event]?.forEach((cb) => cb(eventObj));
    },
  };
};

const createMockCanvas = (blobContent: Blob | null = new Blob(['fake-image'], { type: 'image/jpeg' })) => {
  return {
    width: 0,
    height: 0,
    getContext: vi.fn(() => ({
      drawImage: vi.fn(),
    })),
    toBlob: vi.fn((callback: (blob: Blob | null) => void) => {
      callback(blobContent);
    }),
  };
};

describe('Thumbnail Service', () => {
  describe('Get Video Thumbnail', () => {
    let mockVideoElement: ReturnType<typeof createMockVideoElement>;
    let mockCanvas: ReturnType<typeof createMockCanvas>;
    const originalCreateElement = document.createElement.bind(document);
    const originalCreateObjectURL = URL.createObjectURL;
    const originalRevokeObjectURL = URL.revokeObjectURL;

    beforeEach(() => {
      vi.clearAllMocks();

      mockVideoElement = createMockVideoElement();
      mockCanvas = createMockCanvas();

      vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
        if (tagName === 'video') {
          return mockVideoElement as unknown as HTMLVideoElement;
        }
        if (tagName === 'canvas') {
          return mockCanvas as unknown as HTMLCanvasElement;
        }
        return originalCreateElement(tagName);
      });

      URL.createObjectURL = vi.fn(() => 'blob:mock-url');
      URL.revokeObjectURL = vi.fn();
    });

    afterEach(() => {
      vi.restoreAllMocks();
      URL.createObjectURL = originalCreateObjectURL;
      URL.revokeObjectURL = originalRevokeObjectURL;
    });

    test('When video loads successfully, then it should return a video frame to create the thumbnail', async () => {
      const videoFile = new File(['video-content'], 'test-video.mp4', { type: 'video/mp4' });

      const thumbnailPromise = getVideoFrame(videoFile);

      await flushPromises();
      mockVideoElement.trigger('loadedmetadata');

      await flushPromises();
      mockVideoElement.trigger('seeked');

      const result = await thumbnailPromise;

      expect(result).toBeInstanceOf(File);
      expect(URL.createObjectURL).toHaveBeenCalledWith(videoFile);
    });

    test('When video fails to load, then an error indicating so is thrown', async () => {
      const videoFile = new File(['corrupted'], 'corrupted.mp4', { type: 'video/mp4' });

      const thumbnailPromise = getVideoFrame(videoFile);

      await flushPromises();
      mockVideoElement.trigger('error', new Event('error'));

      await expect(thumbnailPromise).rejects.toThrow(ErrorLoadingVideoFileError);
    });

    test('When canvas context is not available, then null is returned', async () => {
      mockCanvas.getContext = vi.fn(() => null) as unknown as typeof mockCanvas.getContext;

      const videoFile = new File(['video-content'], 'test-video.mp4', { type: 'video/mp4' });

      const thumbnailPromise = getVideoFrame(videoFile);

      await flushPromises();
      mockVideoElement.trigger('loadedmetadata');

      await flushPromises();
      mockVideoElement.trigger('seeked');

      const result = await thumbnailPromise;

      expect(result).toBeNull();
      expect(mockCanvas.getContext).toHaveBeenCalledWith('2d');
    });

    test('When canvas blob is not available, then null is returned', async () => {
      mockCanvas = createMockCanvas(null);

      vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
        if (tagName === 'video') {
          return mockVideoElement as unknown as HTMLVideoElement;
        }
        if (tagName === 'canvas') {
          return mockCanvas as unknown as HTMLCanvasElement;
        }
        return originalCreateElement(tagName);
      });

      const videoFile = new File(['video-content'], 'test-video.mp4', { type: 'video/mp4' });

      const thumbnailPromise = getVideoFrame(videoFile);

      await flushPromises();
      mockVideoElement.trigger('loadedmetadata');

      await flushPromises();
      mockVideoElement.trigger('seeked');

      const result = await thumbnailPromise;

      expect(result).toBeNull();
    });

    test('When video duration is less than seek time, then it should seek to half duration', async () => {
      const videoDuration = 3;
      const seekTo = videoDuration / 2;
      mockVideoElement = createMockVideoElement({ duration: videoDuration });

      vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
        if (tagName === 'video') {
          return mockVideoElement as unknown as HTMLVideoElement;
        }
        if (tagName === 'canvas') {
          return mockCanvas as unknown as HTMLCanvasElement;
        }
        return originalCreateElement(tagName);
      });

      const videoFile = new File(['video-content'], 'short-video.mp4', { type: 'video/mp4' });

      const thumbnailPromise = getVideoFrame(videoFile);

      await flushPromises();
      mockVideoElement.trigger('loadedmetadata');

      await flushPromises();
      mockVideoElement.trigger('seeked');

      const result = await thumbnailPromise;

      expect(result).toBeInstanceOf(File);
      expect(mockVideoElement.currentTime).toStrictEqual(seekTo);
    });
  });

  describe('Get Image Thumbnail', () => {
    let mockImage: { onload: (() => void) | null; onerror: (() => void) | null };

    beforeEach(() => {
      vi.clearAllMocks();
      URL.createObjectURL = vi.fn(() => 'blob:mock-url');

      mockImage = { onload: null, onerror: null };
      globalThis.Image = vi.fn(() => mockImage) as any;
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    test('When image is valid, then it should return a resized thumbnail', async () => {
      const imageFile = new File(['image-content'], 'test-image.jpg', { type: 'image/jpeg' });
      const mockThumbnailFile = new File(['thumbnail'], 'thumbnail.png', { type: 'image/png' });

      vi.mocked(Resizer.imageFileResizer).mockImplementation(
        (_file, _maxWidth, _maxHeight, _compressFormat, _quality, _rotation, responseUriFunc) => {
          responseUriFunc(mockThumbnailFile);
        },
      );

      const promise = getImageThumbnail(imageFile);
      mockImage.onload?.();

      const result = await promise;

      expect(result).toBe(mockThumbnailFile);
      expect(Resizer.imageFileResizer).toHaveBeenCalledWith(
        imageFile,
        300,
        300,
        'png',
        100,
        0,
        expect.any(Function),
        'file',
      );
    });

    test('When image is invalid, then it should return nothing', async () => {
      const invalidImageFile = new File(['corrupted'], 'corrupted.jpg', { type: 'image/jpeg' });

      const promise = getImageThumbnail(invalidImageFile);
      mockImage.onerror?.();

      const result = await promise;

      expect(result).toBeNull();
    });
  });

  describe('Download Thumbnail', () => {
    const workspaceBucket = 'workspace-bucket-123';
    const personalBucket = 'personal-bucket-456';

    const mockThumbnail: Thumbnail = {
      id: 1,
      file_id: 123,
      bucket_id: workspaceBucket,
      bucket_file: 'bucket-file-hash',
      type: 'image/png',
      size: 1024,
      max_width: 300,
      max_height: 300,
      encrypt_version: '03-aes',
    };

    beforeEach(() => {
      vi.clearAllMocks();
      vi.mocked(fetchFileBlob).mockResolvedValue(new Blob(['thumbnail-data']));
    });

    test('When downloading thumbnail in workspace context with workspace bucket, then it uses workspace credentials', async () => {
      vi.mocked(localStorageService.getUser).mockReturnValue({ bucket: personalBucket } as any);

      await downloadThumbnail(mockThumbnail, true);

      expect(fetchFileBlob).toHaveBeenCalledWith(
        expect.objectContaining({
          fileId: mockThumbnail.bucket_file,
          bucketId: mockThumbnail.bucket_id,
        }),
        expect.objectContaining({
          isWorkspace: true,
        }),
      );
    });

    test('When downloading thumbnail in workspace context with personal bucket, then it uses personal credentials for backward compatibility', async () => {
      const thumbnailInPersonalBucket: Thumbnail = {
        ...mockThumbnail,
        bucket_id: personalBucket,
      };

      vi.mocked(localStorageService.getUser).mockReturnValue({ bucket: personalBucket } as any);

      await downloadThumbnail(thumbnailInPersonalBucket, true);

      expect(fetchFileBlob).toHaveBeenCalledWith(
        expect.objectContaining({
          fileId: thumbnailInPersonalBucket.bucket_file,
          bucketId: thumbnailInPersonalBucket.bucket_id,
        }),
        expect.objectContaining({
          isWorkspace: false,
        }),
      );
    });

    test('When downloading thumbnail in personal context, then it uses personal credentials', async () => {
      vi.mocked(localStorageService.getUser).mockReturnValue({ bucket: personalBucket } as any);

      await downloadThumbnail(mockThumbnail, false);

      expect(fetchFileBlob).toHaveBeenCalledWith(
        expect.objectContaining({
          fileId: mockThumbnail.bucket_file,
          bucketId: mockThumbnail.bucket_id,
        }),
        expect.objectContaining({
          isWorkspace: false,
        }),
      );
    });
  });
});
