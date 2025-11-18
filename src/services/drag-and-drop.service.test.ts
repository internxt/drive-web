import { describe, it, expect, vi, beforeEach } from 'vitest';
import { transformDraggedItems } from './drag-and-drop.service';

describe('Drag and Drop Service', () => {
  describe('transformDraggedItems', () => {
    let mockDataTransferItemList: DataTransferItemList;

    beforeEach(() => {
      vi.clearAllMocks();
    });

    const createMockFile = (name: string): File => new File(['content'], name, { type: 'text/plain' });

    const createFileReader = (fileName: string) => vi.fn((cb: (file: File) => void) => cb(createMockFile(fileName)));

    const createEmptyDirectoryReader = () => ({
      readEntries: vi.fn((successCallback: (entries: FileSystemEntry[]) => void) => successCallback([])),
    });

    const createMockFileSystemEntry = (name: string, isFile: boolean): FileSystemEntry => {
      const entry = {
        name,
        isFile,
        isDirectory: !isFile,
        fullPath: `/${name}`,
        filesystem: {} as FileSystem,
        getParent: vi.fn(),
      } as FileSystemEntry;

      if (isFile) {
        (entry as unknown as FileSystemFileEntry).file = createFileReader(name);
      } else {
        (entry as unknown as FileSystemDirectoryEntry).createReader = vi.fn(createEmptyDirectoryReader);
      }
      return entry;
    };

    const createMockDataTransferItem = (file: File | null, entry: FileSystemEntry | null): DataTransferItem =>
      ({
        kind: 'file',
        type: 'text/plain',
        getAsFile: vi.fn(() => file),
        getAsString: vi.fn(),
        webkitGetAsEntry: vi.fn(() => entry),
      }) as unknown as DataTransferItem;

    const createDirectoryReaderWithEntries = (entries: FileSystemEntry[], multiCall: boolean) => {
      let callCount = 0;
      return {
        readEntries: vi.fn((successCallback: (entries: FileSystemEntry[]) => void) => {
          if (multiCall) {
            if (callCount === 0) {
              callCount++;
              successCallback(entries);
            } else {
              successCallback([]);
            }
          } else {
            successCallback(entries);
          }
        }),
      };
    };

    const createMockDirectory = (
      name: string,
      entries: FileSystemEntry[],
      multiCall = true,
    ): FileSystemDirectoryEntry =>
      ({
        name,
        isFile: false,
        isDirectory: true,
        fullPath: `/${name}`,
        filesystem: {} as FileSystem,
        getParent: vi.fn(),
        createReader: vi.fn(() => createDirectoryReaderWithEntries(entries, multiCall)),
      }) as unknown as FileSystemDirectoryEntry;

    const createItemList = (...items: DataTransferItem[]): DataTransferItemList => {
      const list = items as unknown as DataTransferItemList;
      Object.defineProperty(list, 'length', { value: items.length });
      return list;
    };

    it('should transform file items to files array', async () => {
      const mockFile = createMockFile('test.txt');
      const mockEntry = createMockFileSystemEntry('test.txt', true);
      mockDataTransferItemList = createItemList(createMockDataTransferItem(mockFile, mockEntry));

      const result = await transformDraggedItems(mockDataTransferItemList, '/path');

      expect(result.files).toHaveLength(1);
      expect(result.files[0]).toBe(mockFile);
      expect(result.rootList).toHaveLength(0);
    });

    it('should transform directory items to rootList', async () => {
      const mockEntry = createMockFileSystemEntry('folder', false);
      mockDataTransferItemList = createItemList(createMockDataTransferItem(null, mockEntry));

      const result = await transformDraggedItems(mockDataTransferItemList, '/path');

      expect(result.rootList).toHaveLength(1);
      expect(result.rootList[0].name).toBe('folder');
      expect(result.rootList[0].fullPathEdited).toBe('/path/folder');
      expect(result.rootList[0].folderId).toBeNull();
      expect(result.files).toHaveLength(0);
    });

    it('should handle mixed files and directories', async () => {
      const mockFile = createMockFile('file1.txt');
      const mockFileEntry = createMockFileSystemEntry('file1.txt', true);
      const mockDirEntry = createMockFileSystemEntry('folder', false);
      mockDataTransferItemList = createItemList(
        createMockDataTransferItem(mockFile, mockFileEntry),
        createMockDataTransferItem(null, mockDirEntry),
      );

      const result = await transformDraggedItems(mockDataTransferItemList, '/path');

      expect(result.files).toHaveLength(1);
      expect(result.rootList).toHaveLength(1);
    });

    it('should fallback to getAsFile when webkitGetAsEntry returns null', async () => {
      const mockFile = createMockFile('fallback.txt');
      const mockItem = createMockDataTransferItem(mockFile, null);
      mockDataTransferItemList = createItemList(mockItem);

      const result = await transformDraggedItems(mockDataTransferItemList, '/path');

      expect(result.files).toHaveLength(1);
      expect(result.files[0]).toBe(mockFile);
      expect(result.rootList).toHaveLength(0);
      expect(mockItem.getAsFile).toHaveBeenCalled();
    });

    it('should handle empty items list', async () => {
      mockDataTransferItemList = createItemList();

      const result = await transformDraggedItems(mockDataTransferItemList, '/path');

      expect(result.files).toHaveLength(0);
      expect(result.rootList).toHaveLength(0);
    });

    it('should handle nested directory structure', async () => {
      const childFileEntry = createMockFileSystemEntry('child.txt', true);
      const childDirEntry = createMockFileSystemEntry('subfolder', false);
      const mockDirEntry = createMockDirectory('parent', [childFileEntry, childDirEntry]);
      mockDataTransferItemList = createItemList(createMockDataTransferItem(null, mockDirEntry));

      const result = await transformDraggedItems(mockDataTransferItemList, '/path');

      expect(result.rootList).toHaveLength(1);
      expect(result.rootList[0].name).toBe('parent');
      expect(result.rootList[0].childrenFiles).toHaveLength(1);
      expect(result.rootList[0].childrenFolders).toHaveLength(1);
      expect(result.rootList[0].childrenFolders[0].name).toBe('subfolder');
    });

    it('should handle directory with multiple batches of entries', async () => {
      const batches = [
        [createMockFileSystemEntry('file1.txt', true), createMockFileSystemEntry('file2.txt', true)],
        [createMockFileSystemEntry('file3.txt', true)],
        [],
      ];
      let callCount = 0;

      const readEntriesHandler = (successCallback: (entries: FileSystemEntry[]) => void) => {
        successCallback(batches[callCount++] || []);
      };

      const createBatchReader = () => ({ readEntries: vi.fn(readEntriesHandler) });

      const mockDirEntry = {
        name: 'folder',
        isFile: false,
        isDirectory: true,
        fullPath: '/folder',
        filesystem: {} as FileSystem,
        getParent: vi.fn(),
        createReader: vi.fn(createBatchReader),
      } as unknown as FileSystemDirectoryEntry;

      mockDataTransferItemList = createItemList(createMockDataTransferItem(null, mockDirEntry));

      const result = await transformDraggedItems(mockDataTransferItemList, '/path');

      expect(result.rootList).toHaveLength(1);
      expect(result.rootList[0].childrenFiles).toHaveLength(3);
    });

    it('should correctly build fullPathEdited for nested folders', async () => {
      const grandchildEntry = createMockFileSystemEntry('file.txt', true);
      const childDirEntry = createMockDirectory('child', [grandchildEntry]);
      const parentDirEntry = createMockDirectory('parent', [childDirEntry]);
      mockDataTransferItemList = createItemList(createMockDataTransferItem(null, parentDirEntry));

      const result = await transformDraggedItems(mockDataTransferItemList, '/topLevel');

      expect(result.rootList[0].fullPathEdited).toBe('/topLevel/parent');
      expect(result.rootList[0].childrenFolders[0].fullPathEdited).toBe('/topLevel/parent/child');
    });

    it('should handle multiple top-level items', async () => {
      mockDataTransferItemList = createItemList(
        createMockDataTransferItem(createMockFile('file1.txt'), createMockFileSystemEntry('file1.txt', true)),
        createMockDataTransferItem(createMockFile('file2.txt'), createMockFileSystemEntry('file2.txt', true)),
        createMockDataTransferItem(null, createMockFileSystemEntry('folder1', false)),
        createMockDataTransferItem(null, createMockFileSystemEntry('folder2', false)),
      );

      const result = await transformDraggedItems(mockDataTransferItemList, '/path');

      expect(result.files).toHaveLength(2);
      expect(result.rootList).toHaveLength(2);
      expect(result.rootList[0].name).toBe('folder1');
      expect(result.rootList[1].name).toBe('folder2');
    });

    it('should handle directory with only files', async () => {
      const fileEntries = [
        createMockFileSystemEntry('file1.txt', true),
        createMockFileSystemEntry('file2.txt', true),
        createMockFileSystemEntry('file3.txt', true),
      ];
      const mockDirEntry = createMockDirectory('folder', fileEntries);
      mockDataTransferItemList = createItemList(createMockDataTransferItem(null, mockDirEntry));

      const result = await transformDraggedItems(mockDataTransferItemList, '/path');

      expect(result.rootList).toHaveLength(1);
      expect(result.rootList[0].childrenFiles).toHaveLength(3);
      expect(result.rootList[0].childrenFolders).toHaveLength(0);
    });

    it('should handle directory with only subdirectories', async () => {
      const dirEntries = [
        createMockFileSystemEntry('subfolder1', false),
        createMockFileSystemEntry('subfolder2', false),
      ];
      const mockDirEntry = createMockDirectory('folder', dirEntries);
      mockDataTransferItemList = createItemList(createMockDataTransferItem(null, mockDirEntry));

      const result = await transformDraggedItems(mockDataTransferItemList, '/path');

      expect(result.rootList).toHaveLength(1);
      expect(result.rootList[0].childrenFiles).toHaveLength(0);
      expect(result.rootList[0].childrenFolders).toHaveLength(2);
    });

    it('should handle empty directory', async () => {
      const mockDirEntry = createMockFileSystemEntry('emptyFolder', false);
      mockDataTransferItemList = createItemList(createMockDataTransferItem(null, mockDirEntry));

      const result = await transformDraggedItems(mockDataTransferItemList, '/path');

      expect(result.rootList).toHaveLength(1);
      expect(result.rootList[0].name).toBe('emptyFolder');
      expect(result.rootList[0].childrenFiles).toHaveLength(0);
      expect(result.rootList[0].childrenFolders).toHaveLength(0);
    });
  });
});
