import { afterEach, describe, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useDriveExplorerContextMenu } from '../hooks/useDriveExplorerContextMenu';
import DriveExplorerContextMenu from './DriveExplorerContextMenu';

vi.mock('app/i18n/provider/TranslationProvider', () => ({
  useTranslationContext: () => ({ translate: (key: string) => key }),
}));

const SIDEBAR_WIDTH = 240;
const NAVBAR_HEIGHT = 64;

const ExplorerWithContextMenu = ({
  isTrash,
  isFavorites,
  actions,
}: {
  isTrash: boolean;
  isFavorites: boolean;
  actions: Record<string, () => void>;
}) => {
  const contextMenu = useDriveExplorerContextMenu();

  return (
    <div style={{ display: 'flex' }}>
      <div data-testid="outside" style={{ width: SIDEBAR_WIDTH, flexShrink: 0 }}>
        Sidebar
      </div>
      <div style={{ position: 'relative', flexGrow: 1, marginTop: NAVBAR_HEIGHT }}>
        <div
          data-testid="explorer"
          style={{ height: `calc(100vh - ${NAVBAR_HEIGHT}px)` }}
          role="none"
          onContextMenu={contextMenu.onContainerContextMenu}
          onClick={contextMenu.closeContextMenu}
          ref={contextMenu.containerRef}
        >
          <DriveExplorerContextMenu
            isTrash={isTrash}
            isFavorites={isFavorites}
            isOpen={contextMenu.isOpen}
            position={contextMenu.position}
            menuRef={contextMenu.menuRef}
            onClose={contextMenu.closeContextMenu}
            onCreateFolderButtonClicked={actions.createFolder}
            onUploadFileButtonClicked={actions.uploadFiles}
            onUploadFolderButtonClicked={actions.uploadFolder}
            onClearTrashButtonClicked={actions.clearTrash}
          />
          <div
            data-testid="item"
            onMouseEnter={() => contextMenu.setAreItemsHovered(true)}
            onMouseLeave={() => contextMenu.setAreItemsHovered(false)}
          >
            report.pdf
          </div>
        </div>
      </div>
    </div>
  );
};

const renderExplorer = ({ isTrash = false, isFavorites = false } = {}) => {
  const actions = { createFolder: vi.fn(), uploadFiles: vi.fn(), uploadFolder: vi.fn(), clearTrash: vi.fn() };
  render(<ExplorerWithContextMenu isTrash={isTrash} isFavorites={isFavorites} actions={actions} />);
  return actions;
};

const rightClickExplorer = (clientX = 100, clientY = 100) =>
  fireEvent.contextMenu(screen.getByTestId('explorer'), { clientX, clientY });

const openedMenu = () =>
  screen.queryByText('actions.upload.uploadFiles') ?? screen.queryByText('drive.clearTrash.accept');

const menuBox = () => {
  const menuContent = openedMenu();
  if (!menuContent) throw new Error('The context menu is not open');
  return (menuContent.closest('.shadow-subtle-hard') as HTMLElement).getBoundingClientRect();
};

const pressShiftF = () => fireEvent.keyDown(document, { key: 'F', code: 'KeyF', shiftKey: true });

describe('Drive explorer context menu', () => {
  afterEach(() => {
    cleanup();
  });

  test('When the user right-clicks an empty area, then the upload options open at the cursor', () => {
    renderExplorer();

    rightClickExplorer(120, 80);

    expect(screen.getByText('actions.upload.folder')).toBeInTheDocument();
    expect(screen.getByText('actions.upload.uploadFiles')).toBeInTheDocument();
    expect(screen.getByText('actions.upload.uploadFolder')).toBeInTheDocument();
    expect(menuBox().left).toBe(120);
    expect(menuBox().top).toBe(80);
  });

  test('When the user right-clicks close to the bottom right corner, then the whole menu stays visible', () => {
    renderExplorer();

    rightClickExplorer(window.innerWidth - 5, window.innerHeight - 5);

    expect(menuBox().right).toBeLessThanOrEqual(window.innerWidth);
    expect(menuBox().bottom).toBeLessThanOrEqual(window.innerHeight);
  });

  test('When the user picks an option, then it runs and the menu closes', () => {
    const actions = renderExplorer();
    rightClickExplorer();

    fireEvent.click(screen.getByText('actions.upload.uploadFiles'));

    expect(actions.uploadFiles).toHaveBeenCalled();
    expect(openedMenu()).not.toBeInTheDocument();
  });

  test('When the user clicks outside the explorer, then the menu closes', () => {
    renderExplorer();
    rightClickExplorer();

    fireEvent.mouseDown(screen.getByTestId('outside'));

    expect(openedMenu()).not.toBeInTheDocument();
  });

  test('When the user right-clicks an item, then the explorer menu does not open', () => {
    renderExplorer();
    fireEvent.mouseEnter(screen.getByTestId('item'));

    fireEvent.contextMenu(screen.getByTestId('item'));

    expect(openedMenu()).not.toBeInTheDocument();
  });

  test('When the menu is open and the user presses Shift+F, then a new folder is requested and the menu closes', () => {
    const actions = renderExplorer();
    rightClickExplorer();

    pressShiftF();

    expect(actions.createFolder).toHaveBeenCalled();
    expect(openedMenu()).not.toBeInTheDocument();
  });

  test('When the menu is closed and the user presses Shift+F, then no folder is requested', () => {
    const actions = renderExplorer();

    pressShiftF();

    expect(actions.createFolder).not.toHaveBeenCalled();
  });

  test('When the user right-clicks in the trash, then only the option to clear the trash is shown', () => {
    renderExplorer({ isTrash: true });

    rightClickExplorer();

    expect(screen.getByText('drive.clearTrash.accept')).toBeInTheDocument();
    expect(screen.queryByText('actions.upload.uploadFiles')).not.toBeInTheDocument();
  });

  test('When the user picks the option to clear the trash, then clearing the trash is requested', () => {
    const actions = renderExplorer({ isTrash: true });
    rightClickExplorer();

    fireEvent.click(screen.getByText('drive.clearTrash.accept'));

    expect(actions.clearTrash).toHaveBeenCalled();
  });

  test('When the trash menu is open and the user presses Shift+F, then no folder is requested', () => {
    const actions = renderExplorer({ isTrash: true });
    rightClickExplorer();

    pressShiftF();

    expect(actions.createFolder).not.toHaveBeenCalled();
  });

  test('When the user right-clicks in favorites, then no menu is shown', () => {
    renderExplorer({ isFavorites: true });

    rightClickExplorer();

    expect(screen.queryByText('actions.upload.uploadFiles')).not.toBeInTheDocument();
    expect(screen.queryByText('drive.clearTrash.accept')).not.toBeInTheDocument();
  });
});
