import { afterEach, describe, expect, Mock, test, vi } from 'vitest';
import { FlatFolderZip } from '../../core/services/zip.service';
import { addAllFilesToZip, addAllSharedFilesToZip, addFilesToZip } from './filesZip.service';
import { binaryStreamToBlob } from 'app/core/services/stream.service';

const mockDownloadFile = vi.fn();
vi.mock('app/core/services/stream.service', () => ({
  binaryStreamToBlob: vi.fn(),
}));

class MockFlatFolderZip {
  // zip variable public to spy with Vitest
  public zip: any;
  private passThrough: any;
  private folderName: string;

  constructor(folderName: string) {
    this.folderName = folderName;
    this.zip = {
      addFile: vi.fn(),
      addFolder: vi.fn(),
      end: vi.fn(),
    };
    this.passThrough = {
      pipeTo: vi.fn().mockReturnValue(Promise.resolve()),
    };
  }

  addFile(name: string, source: ReadableStream<Uint8Array>): void {
    this.zip.addFile(name, source);
  }

  addFolder(name: string): void {
    this.zip.addFolder(name);
  }

  async close(): Promise<void> {
    await this.zip.end();
  }
}

describe('filesZip', () => {
  const filesPage1 = [
    { name: 'file1', type: 'txt' },
    { name: 'file2', type: 'pdf' },
    { name: 'file4', type: 'pdf' },
    { name: 'file44', type: 'txt' },
  ];

  const filesPage2 = [
    { name: 'file1', type: 'txt' },
    { name: 'file2', type: 'pdf' },
    { name: 'file4', type: 'pdf' },
    { name: 'file44', type: 'txt' },
  ];

  const filesPage3 = [
    { name: 'file1', type: 'txt' },
    { name: 'file2', type: 'pdf' },
    { name: 'file4', type: 'pdf' },
    { name: 'file44', type: 'txt' },
  ];

  let iterator = {
    next: vi
      .fn()
      .mockReturnValueOnce({ value: filesPage1, done: false })
      .mockReturnValueOnce({ value: filesPage2, done: false })
      .mockReturnValueOnce({ value: filesPage3, done: true }),
  };

  let sharedIterator = {
    next: vi
      .fn()
      .mockReturnValueOnce({ value: filesPage1, done: false, token: 'token' })
      .mockReturnValueOnce({ value: filesPage2, done: false, token: 'token' })
      .mockReturnValueOnce({ value: filesPage3, done: true, token: 'token' }),
  };

  const zip = new MockFlatFolderZip('folderName') as unknown as MockFlatFolderZip;

  afterEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    iterator = {
      next: vi
        .fn()
        .mockReturnValueOnce({ value: filesPage1, done: false })
        .mockReturnValueOnce({ value: filesPage2, done: false })
        .mockReturnValueOnce({ value: filesPage3, done: true }),
    };
    sharedIterator = {
      next: vi
        .fn()
        .mockReturnValueOnce({ value: filesPage1, done: false, token: 'token' })
        .mockReturnValueOnce({ value: filesPage2, done: false, token: 'token' })
        .mockReturnValueOnce({ value: filesPage3, done: true, token: 'token' }),
    };
  });
  describe('addAllFilesToZip', () => {
    test('should add all files to the zip correctly', async () => {
      mockDownloadFile.mockResolvedValue('Mocked file stream');
      const zip = new MockFlatFolderZip('folderName');
      const addFile = vi.spyOn(zip.zip, 'addFile');

      const result = await addAllFilesToZip(
        '/path/to/files',
        mockDownloadFile,
        iterator,
        zip as unknown as FlatFolderZip,
      );

      const allFilesLength = filesPage1.length + filesPage2.length + filesPage3.length;
      const allFiles = [...filesPage1, ...filesPage2, ...filesPage3];
      expect(mockDownloadFile).toHaveBeenCalledTimes(allFilesLength);
      expect(addFile).toHaveBeenCalledTimes(allFilesLength);
      expect(result).toEqual(allFiles);
    });

    test('should handle empty iterator correctly', async () => {
      const addFile = vi.spyOn(zip.zip, 'addFile');
      const result = await addAllFilesToZip(
        '/path/to/files',
        mockDownloadFile,
        { next: vi.fn().mockReturnValue({ value: [], done: true }) },
        zip as unknown as FlatFolderZip,
      );
      expect(mockDownloadFile).not.toHaveBeenCalled();
      expect(addFile).not.toHaveBeenCalled();
      expect(result).toEqual([]);
    });

    test('should handle errors during file download', async () => {
      mockDownloadFile.mockRejectedValueOnce(new Error('Download error'));
      const addFile = vi.spyOn(zip.zip, 'addFile');

      await expect(
        addAllFilesToZip('/path/to/files', mockDownloadFile, iterator, zip as unknown as FlatFolderZip),
      ).rejects.toThrow('Download error');

      expect(addFile).not.toHaveBeenCalled();
    });
  });
  describe('addAllSharedFilesToZip', () => {
    test('should add all shared files to the zip correctly', async () => {
      mockDownloadFile.mockResolvedValue('Mocked file stream');
      const zip = new MockFlatFolderZip('folderName');
      const addFile = vi.spyOn(zip.zip, 'addFile');

      const result = await addAllSharedFilesToZip(
        '/path/to/files',
        mockDownloadFile,
        sharedIterator,
        zip as unknown as FlatFolderZip,
      );

      const allFilesLength = filesPage1.length + filesPage2.length + filesPage3.length;
      const allFiles = [...filesPage1, ...filesPage2, ...filesPage3];
      expect(mockDownloadFile).toHaveBeenCalledTimes(allFilesLength);
      expect(addFile).toHaveBeenCalledTimes(allFilesLength);
      expect(result.files).toEqual(allFiles);
      expect(result.token).toEqual('token');
    });

    test('should handle empty shared iterator correctly', async () => {
      const addFile = vi.spyOn(zip.zip, 'addFile');
      const result = await addAllSharedFilesToZip(
        '/path/to/files',
        mockDownloadFile,
        { next: vi.fn().mockReturnValue({ value: [], done: true, token: 'token' }) },
        zip as unknown as FlatFolderZip,
      );

      expect(mockDownloadFile).not.toHaveBeenCalled();
      expect(addFile).not.toHaveBeenCalled();
      expect(result.files).toEqual([]);
      expect(result.token).toEqual('token');
    });

    test('should handle errors during shared file download', async () => {
      const addFile = vi.spyOn(zip.zip, 'addFile');
      mockDownloadFile.mockRejectedValueOnce(new Error('Download error'));

      await expect(
        addAllSharedFilesToZip('/path/to/files', mockDownloadFile, sharedIterator, zip as unknown as FlatFolderZip),
      ).rejects.toThrow('Download error');

      expect(addFile).not.toHaveBeenCalled();
    });
  });
  describe('addFilesToZip', () => {
    test('should skip adding file to zip if fileStream is undefined', async () => {
      mockDownloadFile.mockResolvedValue(undefined);
      const zip = new MockFlatFolderZip('folderName');
      const addFile = vi.spyOn(zip.zip, 'addFile');

      const iterator = {
        next: vi
          .fn()
          .mockReturnValueOnce({ value: filesPage1, done: false })
          .mockReturnValueOnce({ value: [], done: true }),
      };

      const result = await addFilesToZip('/path/to/files', mockDownloadFile, iterator, zip as unknown as FlatFolderZip);

      expect(mockDownloadFile).toHaveBeenCalledTimes(filesPage1.length);
      expect(addFile).not.toHaveBeenCalled();
      expect(result.files).toEqual(filesPage1);
    });

    test('should handle partial failures in downloadPromise', async () => {
      mockDownloadFile
        .mockResolvedValueOnce('Mocked file stream')
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce('Mocked file stream');

      const zip = new MockFlatFolderZip('folderName');
      const addFile = vi.spyOn(zip.zip, 'addFile');

      const iterator = {
        next: vi
          .fn()
          .mockReturnValueOnce({ value: filesPage1, done: false })
          .mockReturnValueOnce({ value: [], done: true }),
      };

      const result = await addFilesToZip('/path/to/files', mockDownloadFile, iterator, zip as unknown as FlatFolderZip);

      expect(mockDownloadFile).toHaveBeenCalledTimes(filesPage1.length);
      expect(addFile).toHaveBeenCalledTimes(2); // Only successful downloads
      expect(result.files).toEqual(filesPage1);
    });

    test('should correctly handle large files that cannot be buffered', async () => {
      const largeFile = { name: 'largeFile', type: 'txt', size: (60 * 1024 * 1024).toString() }; // 60MB
      const smallFile = { name: 'smallFile', type: 'txt', size: (10 * 1024 * 1024).toString() }; // 10MB

      mockDownloadFile.mockImplementation(() =>
        Promise.resolve({
          name: 'mockedFile',
          type: 'txt',
          blob: {
            stream: vi.fn().mockReturnValue({
              getReader: () => ({
                read: vi.fn().mockResolvedValue({ done: true, value: undefined }),
                releaseLock: vi.fn(),
              }),
            }),
          },
        }),
      );

      const zip = new MockFlatFolderZip('folderName');
      const addFile = vi.spyOn(zip.zip, 'addFile');

      const iterator = {
        next: vi
          .fn()
          .mockReturnValueOnce({ value: [largeFile, smallFile], done: false })
          .mockReturnValueOnce({ value: [], done: true }),
      };

      const result = await addFilesToZip('/path/to/files', mockDownloadFile, iterator, zip as unknown as FlatFolderZip);

      expect(mockDownloadFile).toHaveBeenCalledTimes(2);
      expect(addFile).toHaveBeenCalledTimes(2);
      expect(result.files).toEqual([largeFile, smallFile]);
    });

    test('should correctly chunk files based on max cache size', async () => {
      const file1 = { name: 'file1', type: 'txt', size: (20 * 1024 * 1024).toString() }; // 20MB
      const file2 = { name: 'file2', type: 'txt', size: (20 * 1024 * 1024).toString() }; // 20MB
      const file3 = { name: 'file3', type: 'txt', size: (15 * 1024 * 1024).toString() }; // 15MB

      mockDownloadFile.mockImplementation(() =>
        Promise.resolve({
          name: 'mockedFile',
          type: 'txt',
          blob: {
            stream: vi.fn().mockReturnValue({
              getReader: () => ({
                read: vi.fn().mockResolvedValue({ done: true, value: undefined }),
                releaseLock: vi.fn(),
              }),
            }),
          },
        }),
      );

      (binaryStreamToBlob as Mock).mockResolvedValue({
        stream: vi.fn().mockReturnValue(new ReadableStream()),
      });

      const zip = new MockFlatFolderZip('folderName');
      const addFile = vi.spyOn(zip.zip, 'addFile');

      const iterator = {
        next: vi
          .fn()
          .mockReturnValueOnce({ value: [file1, file2, file3], done: false })
          .mockReturnValueOnce({ value: [], done: true }),
      };

      const result = await addFilesToZip('/path/to/files', mockDownloadFile, iterator, zip as unknown as FlatFolderZip);

      expect(mockDownloadFile).toHaveBeenCalledTimes(3);
      expect(addFile).toHaveBeenCalledTimes(3);
      expect(result.files).toEqual([file1, file2, file3]);
    });

    test('should validate fileStream is not undefined', async () => {
      mockDownloadFile.mockResolvedValue(undefined);
      const zip = new MockFlatFolderZip('folderName');
      const addFile = vi.spyOn(zip.zip, 'addFile');

      const iterator = {
        next: vi
          .fn()
          .mockReturnValueOnce({ value: filesPage1, done: false })
          .mockReturnValueOnce({ value: [], done: true }),
      };

      const result = await addFilesToZip('/path/to/files', mockDownloadFile, iterator, zip as unknown as FlatFolderZip);

      expect(mockDownloadFile).toHaveBeenCalledTimes(filesPage1.length);
      expect(addFile).not.toHaveBeenCalled();
      expect(result.files).toEqual(filesPage1);
    });

    test('should validate downloadPromise resolves correctly', async () => {
      mockDownloadFile
        .mockResolvedValueOnce('Mocked file stream')
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce('Mocked file stream')
        .mockResolvedValueOnce('Mocked file stream');

      const zip = new MockFlatFolderZip('folderName');
      const addFile = vi.spyOn(zip.zip, 'addFile');

      const iterator = {
        next: vi
          .fn()
          .mockReturnValueOnce({ value: filesPage1, done: false })
          .mockReturnValueOnce({ value: [], done: true }),
      };

      const result = await addFilesToZip('/path/to/files', mockDownloadFile, iterator, zip as unknown as FlatFolderZip);

      expect(mockDownloadFile).toHaveBeenCalledTimes(filesPage1.length);
      expect(addFile).toHaveBeenCalledTimes(3);
      expect(result.files).toEqual(filesPage1);
    });

    test('should validate downloadFile is called for each file', async () => {
      mockDownloadFile.mockResolvedValue('Mocked file stream');
      const zip = new MockFlatFolderZip('folderName');
      const addFile = vi.spyOn(zip.zip, 'addFile');

      const iterator = {
        next: vi
          .fn()
          .mockReturnValueOnce({ value: filesPage1, done: false })
          .mockReturnValueOnce({ value: [], done: true }),
      };

      const result = await addFilesToZip('/path/to/files', mockDownloadFile, iterator, zip as unknown as FlatFolderZip);

      expect(mockDownloadFile).toHaveBeenCalledTimes(filesPage1.length);
      expect(addFile).toHaveBeenCalledTimes(filesPage1.length);
      expect(result.files).toEqual(filesPage1);
    });

    test('should not add undefined downloadPromise to downloadPromises array', async () => {
      mockDownloadFile
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce('Mocked file stream')
        .mockResolvedValueOnce('Mocked file stream');

      mockDownloadFile.mockImplementation((file) => {
        if (!file) {
          return Promise.resolve(undefined);
        }
        return Promise.resolve({
          name: file.name,
          type: file.type,
          size: file.size,
          blob: {
            stream: vi.fn().mockReturnValue({
              getReader: () => ({
                read: vi.fn().mockResolvedValue({ done: true, value: undefined }),
                releaseLock: vi.fn(),
              }),
            }),
          },
        });
      });
      (binaryStreamToBlob as Mock).mockResolvedValue({
        stream: vi.fn().mockReturnValue(new ReadableStream()),
      });

      const zip = new MockFlatFolderZip('folderName');
      const addFile = vi.spyOn(zip.zip, 'addFile');

      const iterator = {
        next: vi
          .fn()
          .mockReturnValueOnce({ value: filesPage1, done: false })
          .mockReturnValueOnce({ value: [], done: true }),
      };

      await addFilesToZip('/path/to/files', mockDownloadFile, iterator, zip as unknown as FlatFolderZip);

      expect(mockDownloadFile).toHaveBeenCalledTimes(filesPage1.length);
      expect(addFile).toHaveBeenCalledTimes(2);
    });

    test('should handle empty filesChunk gracefully', async () => {
      const zip = new MockFlatFolderZip('folderName');
      const addFile = vi.spyOn(zip.zip, 'addFile');

      const iterator = {
        next: vi.fn().mockReturnValueOnce({ value: [], done: true }),
      };

      const result = await addFilesToZip('/path/to/files', mockDownloadFile, iterator, zip as unknown as FlatFolderZip);

      expect(mockDownloadFile).not.toHaveBeenCalled();
      expect(addFile).not.toHaveBeenCalled();
      expect(result.files).toEqual([]);
    });
  });
});
