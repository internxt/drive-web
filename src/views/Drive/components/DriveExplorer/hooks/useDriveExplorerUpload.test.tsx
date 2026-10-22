import { ChangeEvent } from 'react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { fireEvent, render, renderHook, screen } from '@testing-library/react';
import storageThunks from 'app/store/slices/storage/storage.thunks';
import {
  handleRepeatedUploadingFiles,
  handleRepeatedUploadingFolders,
} from 'app/store/slices/storage/storage.thunks/renameItemsThunk';
import { uploadFoldersWithTracking } from 'app/drive/services/folder.service/uploadFoldersWithTracking';
import UploadInputs from '../components/UploadInputs';
import { UPLOAD_ITEMS_LIMIT } from '../helpers/uploadHelpers';
import { useDriveExplorerUpload } from './useDriveExplorerUpload';

const { dispatch } = vi.hoisted(() => ({ dispatch: vi.fn(() => Promise.resolve()) }));

vi.mock('app/store/hooks', () => ({
  useAppDispatch: () => dispatch,
  useAppSelector: vi.fn(),
}));
vi.mock('app/store/slices/fileVersions', () => ({
  fileVersionsSelectors: { getMaxFileSizeLimit: vi.fn() },
}));
vi.mock('app/store/slices/workspaces/workspaces.selectors', () => ({
  default: { getSelectedWorkspace: vi.fn() },
}));
vi.mock('app/store/slices/storage/storage.thunks', () => ({
  default: { uploadItemsThunk: vi.fn((payload) => ({ type: 'uploadItems', payload })) },
}));
vi.mock('app/store/slices/storage/storage.thunks/fetchSortedFolderContentThunk', () => ({
  fetchSortedFolderContentThunk: vi.fn(),
}));
vi.mock('app/store/slices/storage/storage.thunks/renameItemsThunk', () => ({
  handleRepeatedUploadingFiles: vi.fn(),
  handleRepeatedUploadingFolders: vi.fn(),
}));
vi.mock('app/drive/services/folder.service/uploadFoldersWithTracking', () => ({
  uploadFoldersWithTracking: vi.fn(() => Promise.resolve()),
}));
vi.mock('app/notifications/services/notifications.service', () => ({
  default: { show: vi.fn() },
  ToastType: { Warning: 'warning' },
}));

const CURRENT_FOLDER_ID = 'current-folder-uuid';

const UploadArea = () => {
  const upload = useDriveExplorerUpload(CURRENT_FOLDER_ID);

  return (
    <>
      <button onClick={upload.onUploadFileButtonClicked}>Upload files</button>
      <button onClick={upload.onUploadFolderButtonClicked}>Upload folder</button>
      <UploadInputs {...upload} />
    </>
  );
};

const aFileInFolder = (relativePath: string) => {
  const file = new File(['content'], relativePath.split('/').pop() as string);
  Object.defineProperty(file, 'webkitRelativePath', { value: relativePath });
  return file;
};

const pickFiles = (input: HTMLElement, files: File[]) => {
  Object.defineProperty(input, 'value', { value: `C:\\fakepath\\${files[0].name}`, writable: true });
  Object.defineProperty(input, 'files', { value: files });
  fireEvent.change(input);
};

const fileInput = (container: HTMLElement) => container.querySelector('[data-test="input-file"]') as HTMLInputElement;
const folderInput = (container: HTMLElement) =>
  container.querySelector('[data-test="input-folder"]') as HTMLInputElement;

describe('Uploading from the Drive explorer pickers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(handleRepeatedUploadingFiles).mockImplementation(async (files) => ({
      repeatedItems: [],
      existingItems: [],
      unrepeatedItems: files,
    }));
    vi.mocked(handleRepeatedUploadingFolders).mockImplementation(async (folders) => ({
      repeatedItems: [],
      existingItems: [],
      unrepeatedItems: folders,
    }));
  });

  test('When the user clicks to upload files or a folder, then the matching picker opens', () => {
    const { container } = render(<UploadArea />);
    const openedPickers: string[] = [];
    fileInput(container).addEventListener('click', () => openedPickers.push('files'));
    folderInput(container).addEventListener('click', () => openedPickers.push('folder'));

    fireEvent.click(screen.getByRole('button', { name: 'Upload files' }));
    fireEvent.click(screen.getByRole('button', { name: 'Upload folder' }));

    expect(openedPickers).toStrictEqual(['files', 'folder']);
  });

  test('When the user picks files, then they are uploaded to the current folder', async () => {
    const { container } = render(<UploadArea />);
    const files = [new File(['content'], 'report.pdf')];

    pickFiles(fileInput(container), files);

    await vi.waitFor(() =>
      expect(storageThunks.uploadItemsThunk).toHaveBeenCalledWith({ files, parentFolderId: CURRENT_FOLDER_ID }),
    );
  });

  test('When the user picks a folder, then the folder and its content are uploaded to the current folder', async () => {
    const { container } = render(<UploadArea />);
    const photo = aFileInFolder('Photos/beach.png');

    pickFiles(folderInput(container), [photo]);

    await vi.waitFor(() =>
      expect(uploadFoldersWithTracking).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: [
            {
              root: expect.objectContaining({ name: 'Photos', folderId: CURRENT_FOLDER_ID, childrenFiles: [photo] }),
              currentFolderId: CURRENT_FOLDER_ID,
            },
          ],
        }),
      ),
    );
  });

  test('When the files have been sent to upload, then the picker is cleared so the same files can be picked again', async () => {
    const { container } = render(<UploadArea />);
    const input = fileInput(container);

    pickFiles(input, [new File(['content'], 'report.pdf')]);

    await vi.waitFor(() => expect(input.value).toBe(''));
  });

  test('When the picked files exceed the upload limit, then the picker is still cleared so the user can pick again', async () => {
    const { container } = render(<UploadArea />);
    const input = fileInput(container);
    const tooManyFiles = Array.from({ length: UPLOAD_ITEMS_LIMIT + 1 }, (_, index) => new File([''], `${index}.txt`));

    pickFiles(input, tooManyFiles);

    await vi.waitFor(() => expect(input.value).toBe(''));
    expect(storageThunks.uploadItemsThunk).not.toHaveBeenCalled();
  });

  test('When checking for name conflicts fails, then the picker is still cleared', async () => {
    vi.mocked(handleRepeatedUploadingFiles).mockRejectedValue(new Error('Network error'));
    const { result } = renderHook(() => useDriveExplorerUpload(CURRENT_FOLDER_ID));
    const input = { files: [new File(['content'], 'report.pdf')], value: 'C:\\fakepath\\report.pdf' };

    await expect(
      result.current.onFileInputChanged({ target: input } as unknown as ChangeEvent<HTMLInputElement>),
    ).rejects.toThrow('Network error');

    expect(input.value).toBe('');
  });
});
