import { beforeEach, describe, expect, test, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';
import errorService from 'services/error.service';
import UploadInputs from '../components/UploadInputs';
import { useDriveExplorerUpload } from './useDriveExplorerUpload';

const { uploadItems } = vi.hoisted(() => ({ uploadItems: vi.fn((): Promise<void> => Promise.resolve()) }));

vi.mock('app/upload/useUploadItems', () => ({ useUploadItems: () => ({ uploadItems }) }));

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
    vi.spyOn(notificationsService, 'show').mockReturnValue(undefined as never);
    vi.spyOn(errorService, 'reportError').mockReturnValue();
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
      expect(uploadItems).toHaveBeenCalledWith({ destinationFolderUuid: CURRENT_FOLDER_ID, roots: [], files }),
    );
  });

  test('When the user picks a folder, then the folder and its content are uploaded to the current folder', async () => {
    const { container } = render(<UploadArea />);
    const photo = aFileInFolder('Photos/beach.png');

    pickFiles(folderInput(container), [photo]);

    await vi.waitFor(() =>
      expect(uploadItems).toHaveBeenCalledWith({
        destinationFolderUuid: CURRENT_FOLDER_ID,
        roots: [expect.objectContaining({ name: 'Photos', childrenFiles: [photo], childrenFolders: [] })],
        files: [],
      }),
    );
  });

  test('When the files have been sent to upload, then the picker is cleared so the same files can be picked again', async () => {
    const { container } = render(<UploadArea />);
    const input = fileInput(container);

    pickFiles(input, [new File(['content'], 'report.pdf')]);

    await vi.waitFor(() => expect(input.value).toBe(''));
  });

  test('When the upload fails, then the user is told the upload failed and the picker is cleared', async () => {
    const uploadError = new Error('Network error');
    uploadItems.mockRejectedValueOnce(uploadError);
    const { container } = render(<UploadArea />);
    const input = fileInput(container);

    pickFiles(input, [new File(['content'], 'report.pdf')]);

    await vi.waitFor(() =>
      expect(notificationsService.show).toHaveBeenCalledWith(
        expect.objectContaining({ text: 'Network error', type: ToastType.Error }),
      ),
    );
    expect(input.value).toBe('');
  });

  test('When the picked folder cannot be read, then the user is told the upload failed and the picker is cleared', async () => {
    const { container } = render(<UploadArea />);
    const input = folderInput(container);
    const unreadableFile = new File(['content'], 'beach.png');
    Object.defineProperty(unreadableFile, 'webkitRelativePath', {
      get: () => {
        throw new Error('Folder could not be read');
      },
    });

    pickFiles(input, [unreadableFile]);

    await vi.waitFor(() =>
      expect(notificationsService.show).toHaveBeenCalledWith(
        expect.objectContaining({ text: 'Folder could not be read', type: ToastType.Error }),
      ),
    );
    expect(input.value).toBe('');
  });
});
