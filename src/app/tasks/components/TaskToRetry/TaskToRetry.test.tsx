import { describe, it, vi, expect, beforeEach } from 'vitest';

vi.mock('../../../network/RetryManager', () => ({
  default: {
    changeStatus: vi.fn(),
  },
  RetryableTask: vi.fn(),
}));
vi.mock('../../../store/hooks', () => ({
  useAppDispatch: vi.fn(),
  useAppSelector: vi.fn(),
}));

vi.mock('app/i18n/provider/TranslationProvider', () => ({
  useTranslationContext: vi.fn().mockReturnValue({
    translate: vi.fn().mockImplementation((value: string) => {
      return value;
    }),
  }),
}));

vi.mock('app/store/slices/storage/hooks/useReduxActions', () => ({
  useReduxActions: vi.fn().mockReturnValue({
    uploadFolder: vi.fn(),
    uploadItem: vi.fn(),
    uploadSharedItem: vi.fn(),
    uploadRetryItem: vi.fn(),
  }),
}));

vi.mock('../../../store/slices/workspaces/workspaces.selectors', () => ({
  default: {
    getSelectedWorkspace: vi.fn(),
    getWorkspaceCredentials: vi.fn(),
  },
}));

vi.mock('../../../network/DownloadManager', () => ({
  DownloadManager: {
    downloadItem: vi.fn(),
  },
}));

vi.mock('@internxt/ui', () => ({
  Modal: vi.fn(({ isOpen, onClose, children }) =>
    isOpen ? (
      <div data-testid="modal">
        <button data-testid="close-button" onClick={onClose} />
        {children}
      </div>
    ) : null,
  ),
  Loader: vi.fn(() => <div data-testid="loader" />),
  Avatar: vi.fn(() => <div data-testid="avatar" />),
  Button: vi.fn(({ onClick, children }) => (
    <button data-testid="button" onClick={onClick}>
      {children}
    </button>
  )),
}));

import { render, fireEvent } from '@testing-library/react';
import TaskToRetry from './TaskToRetry';
import RetryManager, { RetryableTask } from 'app/network/RetryManager';
import { useReduxActions } from 'app/store/slices/storage/hooks/useReduxActions';

describe('TaskToRetry', () => {
  const mockOnClose = vi.fn();

  const files = [
    {
      taskId: 'task-1',
      type: 'upload',
      params: {
        filecontent: {
          content: 'file-content' as any,
          type: 'text/plain',
          name: 'file.txt',
          size: 1024,
          parentFolderId: 'folder-1',
        },
        parentFolderId: 'folder-1',
        taskId: 'task-1',
        userEmail: 'user@example.com',
      },
      status: 'failed',
    },
  ] as RetryableTask[];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the modal when isOpen is true', () => {
    const { getByTestId } = render(<TaskToRetry isOpen={true} files={files} onClose={mockOnClose} />);
    expect(getByTestId('title-taskRetry')).toBeInTheDocument();
  });

  it('does not render the modal when isOpen is false', () => {
    const { queryByTestId } = render(<TaskToRetry isOpen={false} files={files} onClose={mockOnClose} />);
    expect(queryByTestId('title-taskRetry')).not.toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    const { getByTestId } = render(<TaskToRetry isOpen={true} files={files} onClose={mockOnClose} />);
    const closeButton = getByTestId('close-taskRetry-button');
    fireEvent.click(closeButton);
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('renders the file list when files are provided', () => {
    const { queryByTestId } = render(<TaskToRetry isOpen={true} files={files} onClose={mockOnClose} />);
    expect(queryByTestId('finish-msg-taskRetry')).not.toBeInTheDocument();
  });

  it('renders a message when there are no files', () => {
    const { getByTestId } = render(<TaskToRetry isOpen={true} files={[]} onClose={mockOnClose} />);
    expect(getByTestId('finish-msg-taskRetry')).toBeInTheDocument();
  });

  it('calls uploadRetryItem and updates status on downloadItem execution', () => {
    const mockChangeStatus = vi.spyOn(RetryManager, 'changeStatus');
    const mockUseReduxActions = vi.mocked(useReduxActions);
    const mockUploadRetryItem = vi.fn();
    mockUseReduxActions.mockReturnValue({
      uploadFolder: vi.fn(),
      uploadItem: vi.fn(),
      uploadSharedItem: vi.fn(),
      uploadRetryItem: mockUploadRetryItem,
    });

    const { getByTestId } = render(<TaskToRetry isOpen={true} files={files} onClose={mockOnClose} />);
    const downloadItem = getByTestId('task-logger-button');

    if (downloadItem) fireEvent.click(downloadItem);

    expect(mockChangeStatus).toHaveBeenCalledWith('task-1', 'retrying');
    expect(mockUploadRetryItem).toHaveBeenCalledWith({
      uploadFile: 'file-content',
      parentFolderId: 'folder-1',
      taskId: 'task-1',
      fileType: 'text/plain',
    });
  });

  it('updates status to failed if uploadRetryItem throws an error', () => {
    const mockChangeStatus = vi.spyOn(RetryManager, 'changeStatus');
    const mockUseReduxActions = vi.mocked(useReduxActions);
    const mockUploadRetryItem = vi.fn().mockImplementation(() => {
      throw new Error('Upload failed');
    });
    mockUseReduxActions.mockReturnValue({
      uploadFolder: vi.fn(),
      uploadItem: vi.fn(),
      uploadSharedItem: vi.fn(),
      uploadRetryItem: mockUploadRetryItem,
    });

    const { getByTestId } = render(<TaskToRetry isOpen={true} files={files} onClose={mockOnClose} />);

    const downloadItem = getByTestId('task-logger-button');

    if (downloadItem) fireEvent.click(downloadItem);

    expect(mockChangeStatus).toHaveBeenCalledWith('task-1', 'retrying');
    expect(mockChangeStatus).toHaveBeenCalledWith('task-1', 'failed');
  });
});
