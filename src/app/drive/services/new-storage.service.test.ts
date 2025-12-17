import { describe, expect, it, Mock, test, vi } from 'vitest';
import newStorageService from './new-storage.service';
import { SdkFactory } from 'app/core/factory/sdk';

vi.mock('app/core/factory/sdk', () => ({
  SdkFactory: {
    getNewApiInstance: vi.fn(),
  },
}));

describe('newStorageService', () => {
  describe('deleteFolderByUuid', () => {
    const mockFolderId = 'test-folder-id';

    it('should call deleteFolderByUuid with the correct folderId', async () => {
      const mockResponse = vi.fn().mockResolvedValue({});
      const mockStorageClient = { deleteFolderByUuid: mockResponse };
      (SdkFactory.getNewApiInstance as Mock).mockReturnValue({
        createNewStorageClient: () => mockStorageClient,
      });

      await newStorageService.deleteFolderByUuid(mockFolderId);

      expect(mockStorageClient.deleteFolderByUuid).toHaveBeenCalledWith(mockFolderId);
    });
  });

  describe('Get Folder Content by Its Uuid', () => {
    test('When the file size is a string, then it should be parsed to number', async () => {
      const mockFiles = [
        { id: 1, uuid: 'file-1', size: '1024' },
        { id: 2, uuid: 'file-2', size: '2048' },
      ];
      const mockResponse = {
        files: mockFiles,
        children: [],
      };
      const mockCanceler = vi.fn();
      const mockStorageClient = {
        getFolderContentByUuid: vi.fn().mockReturnValue([Promise.resolve(mockResponse), mockCanceler]),
      };
      (SdkFactory.getNewApiInstance as Mock).mockReturnValue({
        createNewStorageClient: () => mockStorageClient,
      });

      const [promise, canceler] = newStorageService.getFolderContentByUuid({
        folderUuid: 'test-folder-uuid',
      });
      const result = await promise;

      expect(canceler).toBe(mockCanceler);
      expect(result.files[0].size).toBe(1024);
      expect(result.files[1].size).toBe(2048);
      expect(typeof result.files[0].size).toBe('number');
      expect(typeof result.files[1].size).toBe('number');
    });

    test('When the file size is a number, then the object is returned as it is', async () => {
      const mockFiles = [{ id: 1, uuid: 'file-1', size: 5000 }];
      const mockResponse = { files: mockFiles, children: [] };
      const mockCanceler = vi.fn();
      const mockStorageClient = {
        getFolderContentByUuid: vi.fn().mockReturnValue([Promise.resolve(mockResponse), mockCanceler]),
      };
      (SdkFactory.getNewApiInstance as Mock).mockReturnValue({
        createNewStorageClient: () => mockStorageClient,
      });

      const [promise] = newStorageService.getFolderContentByUuid({
        folderUuid: 'test-folder-uuid',
      });
      const result = await promise;

      expect(result.files[0].size).toBe(5000);
      expect(typeof result.files[0].size).toBe('number');
    });

    test('When parsing the file size response, then all the other params should not be modified', async () => {
      const mockResponse = { files: [], children: [] };
      const mockCanceler = vi.fn();
      const mockGetFolderContentByUuid = vi.fn().mockReturnValue([Promise.resolve(mockResponse), mockCanceler]);
      const mockStorageClient = { getFolderContentByUuid: mockGetFolderContentByUuid };
      (SdkFactory.getNewApiInstance as Mock).mockReturnValue({
        createNewStorageClient: () => mockStorageClient,
      });

      const params = {
        folderUuid: 'test-folder-uuid',
        limit: 50,
        offset: 10,
        trash: true,
        workspacesToken: 'test-token',
      };
      newStorageService.getFolderContentByUuid(params);

      expect(mockGetFolderContentByUuid).toHaveBeenCalledWith(params);
    });
  });
});
