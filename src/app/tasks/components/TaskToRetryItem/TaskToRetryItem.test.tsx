import { render, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ListChildComponentProps } from 'react-window';
import TaskToRetyItem from './TaskToRetryItem';

vi.mock('app/drive/services/size.service', () => ({
  bytesToString: vi.fn(() => '10 MB'),
}));

vi.mock('services/date.service', () => ({
  formatDefaultDate: vi.fn(() => '9 Jan, 2025 at 12:20'),
}));

vi.mock('i18next', () => ({
  t: vi.fn((key) => key),
}));

describe('TaskToRetyItem', () => {
  const mockDownloadItem = vi.fn();
  const mockFile = {
    params: {
      filecontent: {
        name: 'Test File',
        size: 10485760,
        type: 'pdf',
        content: {
          lastModified: 1677654000000,
        },
      },
    },
    status: 'failed',
  };

  const defaultProps: ListChildComponentProps = {
    index: 0,
    style: {},
    data: {
      files: [mockFile],
      downloadItem: mockDownloadItem,
    },
  };

  it('should render the file name with its extension, plus size and date', () => {
    const { getByText } = render(<TaskToRetyItem {...defaultProps} />);

    expect(getByText('Test File.pdf')).toBeInTheDocument();
    expect(getByText('10 MB - 9 Jan, 2025 at 12:20')).toBeInTheDocument();
  });

  it('should render a retry button when the file status is "failed"', () => {
    const { getByRole } = render(<TaskToRetyItem {...defaultProps} />);
    expect(getByRole('button')).toBeInTheDocument();
  });

  it('should call downloadItem when retry button is clicked', () => {
    const { getByRole } = render(<TaskToRetyItem {...defaultProps} />);
    fireEvent.click(getByRole('button'));
    expect(mockDownloadItem).toHaveBeenCalledWith(mockFile);
  });

  it('should render a spinner when the file status is "retrying"', () => {
    const uploadingFile = { ...mockFile, status: 'retrying' };
    const uploadingProps = { ...defaultProps, data: { files: [uploadingFile], downloadItem: mockDownloadItem } };
    const { container } = render(<TaskToRetyItem {...uploadingProps} />);
    const spinner = container.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('should render a "Not allowed" label instead of a retry button when the file is not retryable', () => {
    const notAllowedFile = { ...mockFile, retryable: false };
    const notAllowedProps = { ...defaultProps, data: { files: [notAllowedFile], downloadItem: mockDownloadItem } };
    const { getByText, queryByRole } = render(<TaskToRetyItem {...notAllowedProps} />);

    expect(getByText('tasks.messages.notAllowed')).toBeInTheDocument();
    expect(queryByRole('button')).not.toBeInTheDocument();
  });
});
