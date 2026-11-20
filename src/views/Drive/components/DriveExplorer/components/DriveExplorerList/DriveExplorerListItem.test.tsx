import { afterEach, describe, expect, test, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { FileStatus } from '@internxt/sdk/dist/drive/storage/types';
import { getDriveItemData } from 'testUtils/fixtures/drive.fixtures';
import DriveExplorerListItem from './DriveExplorerListItem';

const PHOTOS_BUCKET = 'photos-bucket-id';

const mockState = vi.hoisted(() => ({
  user: { user: { photosBucket: 'photos-bucket-id' as string | null } },
  workspaces: { selectedWorkspace: null },
}));

vi.mock('app/i18n/provider/TranslationProvider', () => ({
  useTranslationContext: () => ({ translate: (key: string) => key }),
}));

vi.mock('app/store/hooks', () => ({
  useAppSelector: (selector: (state: typeof mockState) => unknown) => selector(mockState),
}));

vi.mock('views/Drive/hooks', () => ({
  useDriveItemStoreProps: () => ({ isItemSelected: () => false, isEditingName: () => false }),
  useDriveItemActions: () => ({ nameInputRef: { current: null }, downloadAndSetThumbnail: vi.fn() }),
  useDriveItemDrag: () => ({ connectDragSource: (element: JSX.Element) => element, isDraggingThisItem: false }),
  useDriveItemDrop: () => ({ connectDropTarget: (element: JSX.Element) => element, isDraggingOverThisItem: false }),
}));

const parentFolder = { plainName: 'Holidays', status: FileStatus.EXISTS, uuid: 'parent-uuid' };

const renderTrashItem = (overrides: Parameters<typeof getDriveItemData>[0]) =>
  render(<DriveExplorerListItem isTrash item={getDriveItemData({ status: 'TRASHED', ...overrides })} />);

describe('Trash list item location', () => {
  afterEach(() => {
    cleanup();
    mockState.user.user.photosBucket = PHOTOS_BUCKET;
  });

  test('When a photo is in the trash, then its location is Photos', () => {
    renderTrashItem({ bucket: PHOTOS_BUCKET, parent: parentFolder });

    expect(screen.getByText('sideNav.photos')).toBeInTheDocument();
    expect(screen.queryByText('Holidays')).not.toBeInTheDocument();
  });

  test('When the original folder of a photo no longer exists, then its location is still Photos', () => {
    renderTrashItem({ bucket: PHOTOS_BUCKET, parent: undefined });

    expect(screen.getByText('sideNav.photos')).toBeInTheDocument();
  });

  test('When a Drive file is in the trash, then its location is the folder it was in', () => {
    renderTrashItem({ bucket: 'drive-bucket-id', parent: parentFolder });

    expect(screen.getByText('Holidays')).toBeInTheDocument();
    expect(screen.queryByText('sideNav.photos')).not.toBeInTheDocument();
  });

  test('When the user has not activated Photos, then trashed folders keep their location', () => {
    mockState.user.user.photosBucket = null;

    renderTrashItem({ isFolder: true, bucket: null as unknown as string, parent: parentFolder });

    expect(screen.getByText('Holidays')).toBeInTheDocument();
    expect(screen.queryByText('sideNav.photos')).not.toBeInTheDocument();
  });
});
