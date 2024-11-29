import { afterEach, describe, expect, test, vi } from 'vitest';
import { FlatFolderZip } from '../../core/services/zip.service';
import { addAllFilesToZip, addAllSharedFilesToZip } from './filesZip.service';

const mockDownloadFile = vi.fn();

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
});
