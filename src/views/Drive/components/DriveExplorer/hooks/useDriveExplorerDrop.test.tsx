import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import { DndProvider, useDrop } from 'react-dnd';
import { HTML5Backend, NativeTypes } from 'react-dnd-html5-backend';
import { IRoot } from 'app/store/slices/storage/types';
import { transformDraggedItems } from 'services/drag-and-drop.service';
import notificationsService from 'app/notifications/services/notifications.service';
import { useDriveExplorerDrop } from './useDriveExplorerDrop';

vi.mock('services/drag-and-drop.service', () => ({
  transformDraggedItems: vi.fn(),
}));
vi.mock('app/store/slices/storage/storage.thunks', () => ({ default: { uploadItemsThunk: vi.fn() } }));
vi.mock('app/store/slices/storage/storage.thunks/fetchSortedFolderContentThunk', () => ({
  fetchSortedFolderContentThunk: vi.fn(),
}));
vi.mock('app/store/slices/storage/storage.thunks/renameItemsThunk', () => ({
  handleRepeatedUploadingFiles: vi.fn(),
  handleRepeatedUploadingFolders: vi.fn(),
}));
vi.mock('app/drive/services/folder.service/uploadFoldersWithTracking', () => ({
  uploadFoldersWithTracking: vi.fn(),
}));
vi.mock('app/notifications/services/notifications.service', () => ({
  default: { show: vi.fn() },
  ToastType: { Warning: 'warning', Error: 'error' },
}));

const DropArea = ({ onItemsDropped }: { onItemsDropped: (rootList: IRoot[], files: File[]) => Promise<void> }) => {
  const { isOver, dropRef } = useDriveExplorerDrop(onItemsDropped);

  return dropRef(
    <div data-testid="drop-area">
      {isOver && <span>Drop files here</span>}
      <FolderThatHandlesItsOwnDrop />
    </div>,
  );
};

const FolderThatHandlesItsOwnDrop = () => {
  const [, folderDropRef] = useDrop(() => ({ accept: [NativeTypes.FILE], drop: () => ({ handled: true }) }));

  return folderDropRef(<div data-testid="folder-in-list">Photos</div>);
};

const renderDropArea = () => {
  const onItemsDropped = vi.fn(() => Promise.resolve());
  render(
    <DndProvider backend={HTML5Backend}>
      <DropArea onItemsDropped={onItemsDropped} />
    </DndProvider>,
  );
  return { onItemsDropped };
};

const draggedFiles = (...names: string[]) => {
  const dataTransfer = new DataTransfer();
  names.forEach((name) => dataTransfer.items.add(new File(['content'], name)));
  return dataTransfer;
};

const fireDragEvent = (type: string, target: Element, dataTransfer: DataTransfer) =>
  act(() => {
    target.dispatchEvent(new DragEvent(type, { bubbles: true, cancelable: true, dataTransfer }));
  });

let pendingDrag: DataTransfer | null = null;

const dragOver = (target: Element, dataTransfer: DataTransfer) => {
  fireDragEvent('dragenter', target, dataTransfer);
  fireDragEvent('dragover', target, dataTransfer);
  pendingDrag = dataTransfer;
};

const dropOn = (target: Element, dataTransfer: DataTransfer) => {
  dragOver(target, dataTransfer);
  fireDragEvent('drop', target, dataTransfer);
  pendingDrag = null;
};

const releasePendingDrag = () => {
  if (pendingDrag) fireDragEvent('drop', document.body, pendingDrag);
  pendingDrag = null;
};

describe('Dropping files into the Drive explorer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(transformDraggedItems).mockResolvedValue({ rootList: [], files: [] });
  });

  afterEach(() => {
    releasePendingDrag();
    cleanup();
  });

  test('When files are dragged over the explorer, then the drop area is highlighted', () => {
    renderDropArea();

    dragOver(screen.getByTestId('drop-area'), draggedFiles('report.pdf'));

    expect(screen.getByText('Drop files here')).toBeInTheDocument();
  });

  test('When files are dropped, then the dropped items are uploaded', async () => {
    const droppedFile = new File(['content'], 'report.pdf');
    const droppedFolder = { name: 'Photos' } as IRoot;
    vi.mocked(transformDraggedItems).mockResolvedValue({ rootList: [droppedFolder], files: [droppedFile] });
    const { onItemsDropped } = renderDropArea();

    dropOn(screen.getByTestId('drop-area'), draggedFiles('report.pdf'));

    await vi.waitFor(() => expect(onItemsDropped).toHaveBeenCalledWith([droppedFolder], [droppedFile]));
  });

  test('When files are dropped on a folder that handles the drop itself, then the explorer does not upload them again', () => {
    const { onItemsDropped } = renderDropArea();

    dropOn(screen.getByTestId('folder-in-list'), draggedFiles('report.pdf'));

    expect(transformDraggedItems).not.toHaveBeenCalled();
    expect(onItemsDropped).not.toHaveBeenCalled();
  });

  test('When the dropped items cannot be read, then the user is told the upload failed', async () => {
    vi.mocked(transformDraggedItems).mockRejectedValue(new Error('Folder could not be read'));
    const { onItemsDropped } = renderDropArea();

    dropOn(screen.getByTestId('drop-area'), draggedFiles('report.pdf'));

    await vi.waitFor(() =>
      expect(notificationsService.show).toHaveBeenCalledWith(
        expect.objectContaining({ text: 'Folder could not be read', type: 'error' }),
      ),
    );
    expect(onItemsDropped).not.toHaveBeenCalled();
  });
});
