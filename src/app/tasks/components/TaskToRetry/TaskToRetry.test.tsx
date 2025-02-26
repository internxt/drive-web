import { render, fireEvent } from '@testing-library/react';
import { describe, it, vi, expect, beforeEach } from 'vitest';
import * as reduxActionsHook from 'app/store/slices/storage/hooks/useReduxActions';
import * as translationProvider from 'app/i18n/provider/TranslationProvider';
import TaskToRetry from './TaskToRetry';
import RetryManager, { FileToRetry } from 'app/network/RetryManager';

vi.mock('app/shared/components/Modal', () => ({
  default: ({ isOpen, children }: { isOpen: boolean; children: React.ReactNode }) =>
    isOpen ? <div>{children}</div> : null,
}));

vi.mock('app/store/slices/storage/hooks/useReduxActions', () => ({
  useReduxActions: vi.fn(),
}));

vi.mock('app/i18n/provider/TranslationProvider', () => ({
  useTranslationContext: vi.fn(),
}));

describe('TaskToRetry', () => {
  const mockOnClose = vi.fn();
  const mockUploadRetryItem = vi.fn();
  const mockTranslate = vi.fn();
  const mockChangeStatus = vi.spyOn(RetryManager, 'changeStatus');

  const files: FileToRetry[] = [
    {
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
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (reduxActionsHook.useReduxActions as any).mockReturnValue({ uploadRetryItem: mockUploadRetryItem });
    (translationProvider.useTranslationContext as any).mockReturnValue({ translate: mockTranslate });
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
    const { getByTestId } = render(<TaskToRetry isOpen={true} files={files} onClose={mockOnClose} />);

    const downloadItem = getByTestId('task-logger-button');

    if (downloadItem) fireEvent.click(downloadItem);

    expect(mockChangeStatus).toHaveBeenCalledWith('task-1', 'uploading');
    expect(mockUploadRetryItem).toHaveBeenCalledWith({
      uploadFile: 'file-content',
      parentFolderId: 'folder-1',
      taskId: 'task-1',
      fileType: 'text/plain',
    });
  });

  it('updates status to failed if uploadRetryItem throws an error', () => {
    mockUploadRetryItem.mockImplementationOnce(() => {
      throw new Error('Upload failed');
    });

    const { getByTestId } = render(<TaskToRetry isOpen={true} files={files} onClose={mockOnClose} />);

    const downloadItem = getByTestId('task-logger-button');

    if (downloadItem) fireEvent.click(downloadItem);

    expect(mockChangeStatus).toHaveBeenCalledWith('task-1', 'uploading');
    expect(mockChangeStatus).toHaveBeenCalledWith('task-1', 'failed');
  });
});
