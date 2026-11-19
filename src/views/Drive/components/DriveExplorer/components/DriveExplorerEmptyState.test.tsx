import { describe, expect, test, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import DriveExplorerEmptyState from './DriveExplorerEmptyState';

vi.mock('app/i18n/provider/TranslationProvider', () => ({
  useTranslationContext: () => ({ translate: (key: string) => key }),
}));

const renderEmptyState = ({ hasFilters = false, isTrash = false, isRecents = false, isFavorites = false } = {}) => {
  const onUploadFileButtonClicked = vi.fn();
  const onContextMenu = vi.fn();

  render(
    <DriveExplorerEmptyState
      hasFilters={hasFilters}
      isTrash={isTrash}
      isRecents={isRecents}
      isFavorites={isFavorites}
      onUploadFileButtonClicked={onUploadFileButtonClicked}
      onContextMenu={onContextMenu}
    />,
  );

  return { onUploadFileButtonClicked, onContextMenu };
};

describe('Drive explorer empty state', () => {
  test('When a Drive folder has no items, then it invites the user to upload files', () => {
    const { onUploadFileButtonClicked } = renderEmptyState();

    fireEvent.click(screen.getByRole('button', { name: /views.recents.empty.uploadFiles/ }));

    expect(screen.getByText('views.recents.empty.folderEmpty')).toBeInTheDocument();
    expect(onUploadFileButtonClicked).toHaveBeenCalled();
  });

  test('When the user right-clicks an empty Drive folder, then the folder context menu is requested', () => {
    const { onContextMenu } = renderEmptyState();

    fireEvent.contextMenu(screen.getByText('views.recents.empty.folderEmpty'));

    expect(onContextMenu).toHaveBeenCalled();
  });

  test('When a search filter returns nothing, then a no-results message is shown with the option to upload files', () => {
    renderEmptyState({ hasFilters: true, isTrash: true });

    expect(screen.getByText('views.recents.empty.noResults')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /views.recents.empty.uploadFiles/ })).toBeInTheDocument();
  });

  test('When there are no recent items, then the recents empty message is shown without an upload option', () => {
    renderEmptyState({ isRecents: true });

    expect(screen.getByText('views.recents.empty.title')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  test('When there are no favorites, then the favorites empty message is shown', () => {
    renderEmptyState({ isFavorites: true });

    expect(screen.getByText('views.favorites.empty.title')).toBeInTheDocument();
  });

  test('When the trash is empty, then the empty trash message is shown without an upload option', () => {
    renderEmptyState({ isTrash: true });

    expect(screen.getByText('trash.empty-state.title')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
