import { ComponentProps, ReactNode } from 'react';
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { DriveFileData } from 'app/drive/types';
import storageReducer from 'app/store/slices/storage';
import uiReducer, { uiActions } from 'app/store/slices/ui';
import FileViewer from './FileViewer';

vi.mock('app/i18n/provider/TranslationProvider', () => ({
  useTranslationContext: () => ({ translate: (key: string) => key }),
}));

const createFile = (overrides: Partial<DriveFileData> = {}): DriveFileData =>
  ({
    id: 1,
    uuid: 'uuid-1',
    name: 'notes',
    plainName: 'notes',
    type: 'txt',
    size: 1024,
    ...overrides,
  }) as DriveFileData;

type FileViewerProps = ComponentProps<typeof FileViewer>;

const renderViewer = (props: Partial<FileViewerProps> = {}) => {
  const store = configureStore({ reducer: { storage: storageReducer, ui: uiReducer } });
  const defaultProps: FileViewerProps = {
    file: createFile(),
    show: true,
    isAuthenticated: true,
    onClose: vi.fn(),
    onDownload: vi.fn(),
    dropdownItems: [],
    ...props,
  };
  const wrapper = ({ children }: { children: ReactNode }) => <Provider store={store}>{children}</Provider>;
  const view = render(<FileViewer {...defaultProps} />, { wrapper });
  const rerender = (changes: Partial<FileViewerProps>) => view.rerender(<FileViewer {...defaultProps} {...changes} />);

  return { store, rerender, props: defaultProps };
};

const loadingBar = () => screen.getByText('drive.loadingFile').parentElement as HTMLElement;
const loadingProgressWidth = () => (loadingBar().querySelector('.bg-white') as HTMLElement).style.width;

describe('File viewer', () => {
  test('When the content is downloading, then the loading bar shows its progress until the content is shown', async () => {
    const { rerender } = renderViewer({ progress: 0.4 });
    expect(loadingProgressWidth()).toBe('40%');
    expect(loadingBar()).toHaveClass('flex');

    rerender({ progress: 0, blob: new Blob(['hello from the file']) });

    expect(await screen.findByText('hello from the file')).toBeInTheDocument();
    expect(loadingBar()).toHaveClass('hidden');
  });

  test('When the file type has no preview, then the viewer says so and offers to download it', () => {
    const { props } = renderViewer({ file: createFile({ type: 'zip' }) });

    fireEvent.click(screen.getAllByTitle('actions.download')[0]);

    expect(screen.getByText('error.noFilePreview')).toBeInTheDocument();
    expect(props.onDownload).toHaveBeenCalled();
  });

  test('When the file is too large to preview, then the viewer explains why there is no preview', () => {
    renderViewer({ file: createFile({ size: 2 ** 40 }) });

    expect(screen.getByText('error.filePreviewTooLarge')).toBeInTheDocument();
  });

  test('When the preview of a file fails, then it stays unavailable after renaming it and the next file is shown right away', async () => {
    const brokenPdf = createFile({ id: 1, type: 'pdf', name: 'broken' });
    const { rerender } = renderViewer({ file: brokenPdf, blob: new Blob(['not a pdf']) });
    await screen.findByText('error.noFilePreview', {}, { timeout: 5000 });

    rerender({ file: { ...brokenPdf, name: 'renamed', plainName: 'renamed' }, blob: new Blob(['not a pdf']) });
    expect(screen.getByText('error.noFilePreview')).toBeInTheDocument();

    rerender({ file: createFile({ id: 2 }), blob: new Blob(['next file']) });
    expect(screen.queryByText('error.noFilePreview')).not.toBeInTheDocument();
    expect(await screen.findByText('next file')).toBeInTheDocument();
  });

  test('When Escape is pressed with a dialog open on top of the viewer, then that dialog is closed', () => {
    const { store } = renderViewer();
    act(() => {
      store.dispatch(uiActions.setIsMoveItemsDialogOpen(true));
    });

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(store.getState().ui.isMoveItemsDialogOpen).toBe(false);
  });

  test('When there are files before and after, then both arrows move between them', () => {
    const navigation = { hasPrevious: true, hasNext: true, goToPrevious: vi.fn(), goToNext: vi.fn() };
    renderViewer({ navigation });

    fireEvent.click(screen.getByTitle('actions.previous'));
    fireEvent.click(screen.getByTitle('actions.next'));

    expect(navigation.goToPrevious).toHaveBeenCalled();
    expect(navigation.goToNext).toHaveBeenCalled();
  });

  test('When the file is opened from a public link, then there are no arrows and the report button is shown', () => {
    const navigation = { hasPrevious: true, hasNext: true, goToPrevious: vi.fn(), goToNext: vi.fn() };

    renderViewer({ navigation, isShareView: true });

    expect(screen.queryByTitle('actions.previous')).not.toBeInTheDocument();
    expect(screen.queryByTitle('actions.next')).not.toBeInTheDocument();
    expect(screen.getByTitle('actions.report')).toBeInTheDocument();
  });
});
