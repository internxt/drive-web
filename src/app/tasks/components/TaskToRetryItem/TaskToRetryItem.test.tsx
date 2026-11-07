import { render, fireEvent } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import TaskToRetyItem, { FailedItemToRetry } from './TaskToRetryItem';

vi.mock('app/drive/services/size.service', () => ({
  bytesToString: vi.fn(() => '10 MB'),
}));

vi.mock('services/date.service', () => ({
  formatDefaultDate: vi.fn(() => '9 Jan, 2025 at 12:20'),
}));

vi.mock('i18next', () => ({
  t: vi.fn((key) => key),
}));

const aFailedItem = (overrides: Partial<FailedItemToRetry> = {}): FailedItemToRetry => ({
  name: 'Test File',
  type: 'pdf',
  size: 10485760,
  modifiedAt: 1677654000000,
  isFolder: false,
  isRetryable: true,
  isRetrying: false,
  retry: vi.fn(),
  ...overrides,
});

const renderFailedItem = (failedItem: FailedItemToRetry) =>
  render(<TaskToRetyItem index={0} style={{}} data={{ failedItems: [failedItem] }} />);

describe('Failed item to retry', () => {
  test('When a failed item is shown, then its name with extension, size and date are displayed', () => {
    const { getByText } = renderFailedItem(aFailedItem());

    expect(getByText('Test File.pdf')).toBeInTheDocument();
    expect(getByText('10 MB - 9 Jan, 2025 at 12:20')).toBeInTheDocument();
  });

  test('When the user clicks retry, then the item is retried', () => {
    const failedItem = aFailedItem();
    const { getByRole } = renderFailedItem(failedItem);

    fireEvent.click(getByRole('button'));

    expect(failedItem.retry).toHaveBeenCalledOnce();
  });

  test('When the item is being retried, then a spinner is shown instead of the retry button', () => {
    const { container, queryByRole } = renderFailedItem(aFailedItem({ isRetrying: true }));

    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
    expect(queryByRole('button')).not.toBeInTheDocument();
  });

  test('When the item cannot be retried, then it is marked as not allowed and has no retry button', () => {
    const { getByText, queryByRole } = renderFailedItem(aFailedItem({ isRetryable: false }));

    expect(getByText('tasks.messages.notAllowed')).toBeInTheDocument();
    expect(queryByRole('button')).not.toBeInTheDocument();
  });
});
