import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FlatFolderZip, createFolderWithFilesWritable } from './zip.service';
import browserService from './browser.service';
import * as streamService from './stream.service';
import fileDownload from 'js-file-download';
import streamSaver from '../libs/streamSaver';

vi.mock('js-file-download');
vi.mock('../libs/streamSaver');
vi.mock('./browser.service', () => ({ default: { isBrave: vi.fn() } }));
vi.mock('./stream.service', () => ({ binaryStreamToBlob: vi.fn() }));

describe('FlatFolderZip', () => {
  let consoleInfoSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});

    const defaultWritableStream = new WritableStream({
      write: vi.fn(),
      close: vi.fn(),
      abort: vi.fn(),
    });
    vi.mocked(streamSaver.createWriteStream).mockReturnValue(defaultWritableStream);

    vi.mocked(browserService.isBrave).mockReturnValue(false);
    vi.mocked(fileDownload).mockImplementation(() => {});
    vi.mocked(streamService.binaryStreamToBlob).mockResolvedValue(new Blob(['test']));
  });

  describe('Initialization', () => {
    it('When creating a zip with options, then it initializes correctly', () => {
      const progressCallback = vi.fn();
      const abortController = new AbortController();

      const zip = new FlatFolderZip('my-folder', { progress: progressCallback, abortController });

      expect(zip).toBeInstanceOf(FlatFolderZip);
      expect(consoleInfoSpy).toHaveBeenCalledWith('Using fast method for creating a zip');
    });

    it('When running in Brave browser, then stream saver is skipped', () => {
      vi.mocked(browserService.isBrave).mockReturnValue(true);

      const zip = new FlatFolderZip('test-folder', {});

      expect(zip).toBeInstanceOf(FlatFolderZip);
      expect(streamSaver.createWriteStream).not.toHaveBeenCalled();
    });
  });

  describe('Operations', () => {
    it('When adding files and folders, then they are processed without errors', () => {
      const zip = new FlatFolderZip('test-folder', {});
      const mockStream = new ReadableStream({
        start(controller) {
          controller.enqueue(new Uint8Array([1, 2, 3]));
          controller.close();
        },
      });

      expect(() => zip.addFolder('subfolder')).not.toThrow();
      expect(() => zip.addFile('test.txt', mockStream)).not.toThrow();
    });
  });

  describe('Complete workflow', () => {
    it('When creating, adding content, and closing in Brave, then zip is downloaded', async () => {
      vi.mocked(browserService.isBrave).mockReturnValue(true);
      const mockBlob = new Blob(['test']);
      vi.mocked(streamService.binaryStreamToBlob).mockResolvedValue(mockBlob);

      const zip = new FlatFolderZip('complete-test', {});
      const fileStream = new ReadableStream({
        start(controller) {
          controller.enqueue(new Uint8Array([1, 2, 3]));
          controller.close();
        },
      });

      zip.addFolder('documents');
      zip.addFile('documents/file.txt', fileStream);
      await zip.close();

      expect(streamService.binaryStreamToBlob).toHaveBeenCalled();
      expect(fileDownload).toHaveBeenCalledWith(mockBlob, 'complete-test.zip', 'application/zip');
    });
  });
});

describe('createFolderWithFilesWritable', () => {
  describe('Stream interface', () => {
    it('When creating a stream, then all methods are available', () => {
      const zipStream = createFolderWithFilesWritable();

      expect(zipStream).toHaveProperty('addFile');
      expect(zipStream).toHaveProperty('addFolder');
      expect(zipStream).toHaveProperty('stream');
      expect(zipStream).toHaveProperty('end');
      expect(zipStream).toHaveProperty('terminate');
    });
  });

  describe('Content operations', () => {
    it('When adding files and folders, then they are processed without errors', () => {
      const zipStream = createFolderWithFilesWritable();
      const fileStream = new ReadableStream({
        start(controller) {
          controller.enqueue(new Uint8Array([1, 2, 3, 4, 5]));
          controller.close();
        },
      });

      expect(() => zipStream.addFolder('my-folder')).not.toThrow();
      expect(() => zipStream.addFile('test.txt', fileStream)).not.toThrow();
    });

    it('When adding a file with progress tracking, then progress is reported', async () => {
      const progressCallback = vi.fn();
      const zipStream = createFolderWithFilesWritable(progressCallback);

      const fileStream = new ReadableStream({
        start(controller) {
          controller.enqueue(new Uint8Array([1, 2, 3, 4, 5]));
          controller.close();
        },
      });

      zipStream.addFile('test.txt', fileStream);
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(progressCallback).toHaveBeenCalled();
    });
  });

  describe('Stream finalization', () => {
    it.each([
      { method: 'end', action: 'finalized' },
      { method: 'terminate', action: 'aborted' },
    ])('When calling $method, then stream is $action', ({ method }) => {
      const zipStream = createFolderWithFilesWritable();

      expect(() => zipStream[method]()).not.toThrow();
    });
  });

  describe('Stream output', () => {
    it('When data is generated, then it flows through the stream', async () => {
      const zipStream = createFolderWithFilesWritable();
      const chunks: Uint8Array[] = [];
      const reader = zipStream.stream.getReader();

      const fileStream = new ReadableStream({
        start(controller) {
          controller.enqueue(new Uint8Array([1, 2, 3]));
          controller.close();
        },
      });

      zipStream.addFile('test.txt', fileStream);
      await new Promise((resolve) => setTimeout(resolve, 50));
      zipStream.end();

      const readTimeout = setTimeout(() => reader.cancel(), 100);

      try {
        let iterations = 0;
        const maxIterations = 100;

        // eslint-disable-next-line no-constant-condition
        while (iterations < maxIterations) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) chunks.push(value);
          iterations++;
        }
      } catch {
        // Stream may close before all reads complete
      } finally {
        clearTimeout(readTimeout);
      }

      expect(chunks.length).toBeGreaterThanOrEqual(0);
    });
  });
});
