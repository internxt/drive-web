import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createFileUploadHandler, createFolderUploadHandler, UPLOAD_ITEMS_LIMIT } from './uploadHelpers';

vi.mock('../../../../store/slices/ui', () => ({
  uiActions: { setIsUploadItemsFailsDialogOpen: vi.fn((value) => ({ type: 'SET_DIALOG', payload: value })) },
}));
vi.mock('../../../../store/slices/storage/storage.thunks', () => ({
  default: { uploadItemsThunk: vi.fn(() => Promise.resolve()) },
}));
vi.mock('../../../../store/slices/storage/storage.thunks/fetchSortedFolderContentThunk', () => ({
  fetchSortedFolderContentThunk: vi.fn(),
}));
vi.mock('../../../../store/slices/storage/storage.thunks/renameItemsThunk', () => ({
  handleRepeatedUploadingFiles: vi.fn((files) => Promise.resolve(files)),
}));
vi.mock('../../../services/folder.service/uploadFolderInput.service', () => ({
  transformInputFilesToJSON: vi.fn(() => ({})),
  transformJsonFilesToItems: vi.fn(() => ({ rootList: [], rootFiles: [] })),
}));

describe('uploadHelpers', () => {
  const mockDispatch = vi.fn().mockReturnValue(Promise.resolve());
  const mockCallbacks = {
    onFileUploaded: vi.fn(),
    resetFileInput: vi.fn(),
    resetFolderInput: vi.fn(),
    uploadItems: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exports UPLOAD_ITEMS_LIMIT constant', () => {
    expect(UPLOAD_ITEMS_LIMIT).toBe(3000);
  });

  describe('createFileUploadHandler', () => {
    it('handles empty files', async () => {
      const handler = createFileUploadHandler(mockDispatch, 'folder-123');
      await handler({ target: { files: null } } as React.ChangeEvent<HTMLInputElement>);
      expect(mockDispatch).not.toHaveBeenCalled();
    });

    it('handles files within limit', async () => {
      const handler = createFileUploadHandler(
        mockDispatch,
        'folder-123',
        mockCallbacks.onFileUploaded,
        mockCallbacks.resetFileInput,
      );
      const files = [new File(['content'], 'test.txt')] as unknown as FileList;
      await handler({ target: { files } } as React.ChangeEvent<HTMLInputElement>);
      expect(mockDispatch).toHaveBeenCalled();
      expect(mockCallbacks.onFileUploaded).toHaveBeenCalled();
      expect(mockCallbacks.resetFileInput).toHaveBeenCalled();
    });

    it('handles files over limit', async () => {
      const handler = createFileUploadHandler(mockDispatch, 'folder-123');
      const files = Array.from(
        { length: UPLOAD_ITEMS_LIMIT + 1 },
        (_, i) => new File([''], `file${i}.txt`),
      ) as unknown as FileList;
      await handler({ target: { files } } as React.ChangeEvent<HTMLInputElement>);
      expect(mockDispatch).toHaveBeenCalledWith({ type: 'SET_DIALOG', payload: true });
    });
  });

  describe('createFolderUploadHandler', () => {
    it('handles empty folder selection', async () => {
      const handler = createFolderUploadHandler('folder-123', {}, mockCallbacks.uploadItems);
      await handler({ target: { files: null } } as React.ChangeEvent<HTMLInputElement>);
      expect(mockCallbacks.uploadItems).not.toHaveBeenCalled();
    });

    it('handles folder upload with files', async () => {
      const handler = createFolderUploadHandler(
        'folder-123',
        { prop: 'value' },
        mockCallbacks.uploadItems,
        mockCallbacks.resetFolderInput,
      );
      const files = [new File(['content'], 'folder/test.txt')] as unknown as FileList;
      await handler({ target: { files } } as React.ChangeEvent<HTMLInputElement>);
      expect(mockCallbacks.uploadItems).toHaveBeenCalledWith({ prop: 'value' }, [], []);
      expect(mockCallbacks.resetFolderInput).toHaveBeenCalled();
    });
  });
});
