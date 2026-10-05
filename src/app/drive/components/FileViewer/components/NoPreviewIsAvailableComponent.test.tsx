import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { NoPreviewIsAvailableComponent } from './NoPreviewIsAvailableComponent';

const GENERIC_TEXT_KEY = 'error.noFilePreview';
const TOO_LARGE_REASON = 'File too large to preview (over 200MB)';

const ItemIcon = () => <svg data-testid="item-icon" />;

const renderComponent = (reason?: string) => {
  const onDownload = vi.fn();

  render(
    <NoPreviewIsAvailableComponent
      fileName="photo.tif"
      onDownload={onDownload}
      translate={(key: string) => key}
      ItemIconComponent={ItemIcon}
      reason={reason}
    />,
  );

  return { onDownload };
};

describe('NoPreviewIsAvailableComponent', () => {
  test('when a reason is given, then it is shown instead of the generic text', () => {
    renderComponent(TOO_LARGE_REASON);

    expect(screen.getByText(TOO_LARGE_REASON)).toBeInTheDocument();
    expect(screen.queryByText(GENERIC_TEXT_KEY)).not.toBeInTheDocument();
  });

  test('when no reason is given, then the generic text is shown', () => {
    renderComponent();

    expect(screen.getByText(GENERIC_TEXT_KEY)).toBeInTheDocument();
  });

  test('when the download button is clicked, then onDownload is called', () => {
    const { onDownload } = renderComponent();

    fireEvent.click(screen.getByTitle('actions.download'));

    expect(onDownload).toHaveBeenCalledTimes(1);
  });
});
