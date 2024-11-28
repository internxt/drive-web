/**
 * @jest-environment jsdom
 */
import { describe, expect, it, vi } from 'vitest';
import { getDraggedItemsWithoutFolders } from './sharedViewUtils';

vi.mock('../../../share/services/share.service', () => ({
  default: {
    shareService: vi.fn(),
  },
}));

const MOCK_FILE_ENTRY = {
  isFile: true,
  isDirectory: false,
  file: vi.fn((successCallback, errorCallback) =>
    successCallback(new File(['file content'], 'mockFile.txt', { type: 'text/plain' })),
  ),
};

const MOCK_FOLDER_ENTRY = {
  isFile: false,
  isDirectory: true,
};

const MOCK_DATA_TRANSFER_FILE_ITEM = {
  webkitGetAsEntry: vi.fn(() => MOCK_FILE_ENTRY),
};

const MOCK_DATA_TRANSFER_FOLDER_ITEM = {
  webkitGetAsEntry: vi.fn(() => MOCK_FOLDER_ENTRY),
};

describe('getDraggedItemsWithoutFolders function - filters out directories and processes files from dragged items', () => {
  it('should return filtered items containing only files and hasFolders as false when no folders are dragged', async () => {
    const onlyOneFileDragged = [MOCK_DATA_TRANSFER_FILE_ITEM] as unknown as DataTransferItem[];
    const result = await getDraggedItemsWithoutFolders(onlyOneFileDragged);

    expect(result.hasFolders).toBe(false);
    expect(result.filteredItems).toHaveLength(1);
    expect(result.filteredItems[0]).toBeInstanceOf(File);
    expect(result.filteredItems[0].name).toBe('mockFile.txt');
  });

  it('should return hasFolders as true and an empty filteredItems array when only folders are dragged', async () => {
    const onlyOneFolderDragged = [MOCK_DATA_TRANSFER_FOLDER_ITEM] as unknown as DataTransferItem[];

    const result = await getDraggedItemsWithoutFolders(onlyOneFolderDragged);

    expect(result.hasFolders).toBe(true);
    expect(result.filteredItems).toHaveLength(0);
  });

  it('should return filteredItems containing only files and hasFolders as true when both files and folders are dragged', async () => {
    const mixedItemsDragged = [
      MOCK_DATA_TRANSFER_FILE_ITEM,
      MOCK_DATA_TRANSFER_FOLDER_ITEM,
    ] as unknown as DataTransferItem[];

    const result = await getDraggedItemsWithoutFolders(mixedItemsDragged);

    expect(result.hasFolders).toBe(true);
    expect(result.filteredItems).toHaveLength(1);
    expect(result.filteredItems[0]).toBeInstanceOf(File);
    expect(result.filteredItems[0].name).toBe('mockFile.txt');
  });

  it('should handle file loading errors gracefully', async () => {
    MOCK_FILE_ENTRY.file = vi.fn((successCallback, errorCallback) => errorCallback(new Error('Error loading files')));

    const fileWithErrorDragged = [MOCK_DATA_TRANSFER_FILE_ITEM] as unknown as DataTransferItem[];

    await expect(getDraggedItemsWithoutFolders(fileWithErrorDragged)).resolves.toEqual({
      filteredItems: [],
      hasFolders: false,
    });
  });
});
