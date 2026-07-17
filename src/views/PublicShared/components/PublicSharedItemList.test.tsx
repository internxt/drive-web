import { Thumbnail } from '@internxt/sdk/dist/drive/storage/types';
import { fireEvent, render, waitFor } from '@testing-library/react';
import { downloadPublicThumbnail } from 'app/drive/services/thumbnail.service';
import { AdvancedSharedItem } from 'app/share/types';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import PublicSharedItemList from './PublicSharedItemList';

vi.mock('app/drive/services/thumbnail.service', () => ({
  downloadPublicThumbnail: vi.fn(),
}));

vi.mock('services/error.service', () => ({
  default: {
    reportError: vi.fn(),
    castError: vi.fn().mockImplementation((e) => ({ message: e.message ?? 'error' })),
  },
}));

const PUBLIC_SHARE_KEY = { mnemonic: 'test mnemonic' };
const CREDENTIALS = { networkUser: 'network-user', networkPass: 'network-pass' };
const THUMBNAIL = { bucket_id: 'thumb-bucket', bucket_file: 'thumb-file' } as unknown as Thumbnail;
const OBJECT_URL = 'blob:mock-thumbnail-url';

const createItem = (overrides: Partial<AdvancedSharedItem> = {}): AdvancedSharedItem =>
  ({
    id: 1,
    uuid: 'item-uuid',
    plainName: 'photo',
    name: 'encrypted-name',
    type: 'png',
    size: '1024',
    isFolder: false,
    thumbnails: [THUMBNAIL],
    credentials: CREDENTIALS,
    ...overrides,
  }) as unknown as AdvancedSharedItem;

const renderList = (items: AdvancedSharedItem[], onItemDoubleClicked = vi.fn()) => {
  const utils = render(
    <PublicSharedItemList
      shareItems={items}
      publicShareKey={PUBLIC_SHARE_KEY}
      isLoading={false}
      hasMoreItems={false}
      onNextPage={vi.fn()}
      onClickItem={vi.fn()}
      onItemDoubleClicked={onItemDoubleClicked}
      selectedItems={[]}
      onSelectedItemsChanged={vi.fn()}
      sortBy={vi.fn()}
    />,
  );
  return { ...utils, onItemDoubleClicked };
};

describe('PublicSharedItemList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(URL, 'createObjectURL').mockReturnValue(OBJECT_URL);
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
  });

  test('When an image item has a thumbnail and credentials, then the thumbnail is downloaded and rendered', async () => {
    const thumbnailBlob = new Blob(['thumbnail-bytes'], { type: 'image/png' });
    vi.mocked(downloadPublicThumbnail).mockResolvedValue(thumbnailBlob);

    const { findByAltText } = renderList([createItem()]);

    const image = await findByAltText('photo.png');
    expect(image).toHaveAttribute('src', OBJECT_URL);
    expect(downloadPublicThumbnail).toHaveBeenCalledWith(
      THUMBNAIL,
      { user: CREDENTIALS.networkUser, pass: CREDENTIALS.networkPass },
      PUBLIC_SHARE_KEY,
    );
  });

  test('When the item is a folder or a non-image file, then the type icon is shown and no thumbnail is downloaded', () => {
    const folder = createItem({ id: 2, uuid: 'folder-uuid', plainName: 'docs', type: undefined, isFolder: true });
    const pdf = createItem({ id: 3, uuid: 'pdf-uuid', plainName: 'report', type: 'pdf' });

    const { container } = renderList([folder, pdf]);

    expect(downloadPublicThumbnail).not.toHaveBeenCalled();
    expect(container.querySelector('img[src="blob:mock-thumbnail-url"]')).toBeNull();
  });

  test('When the item has no credentials yet, then no thumbnail download is attempted', () => {
    renderList([createItem({ credentials: undefined })]);

    expect(downloadPublicThumbnail).not.toHaveBeenCalled();
  });

  test('When the component unmounts after rendering a thumbnail, then the object URL is revoked', async () => {
    vi.mocked(downloadPublicThumbnail).mockResolvedValue(new Blob(['thumbnail-bytes']));

    const { findByAltText, unmount } = renderList([createItem()]);
    await findByAltText('photo.png');

    unmount();

    expect(URL.revokeObjectURL).toHaveBeenCalledWith(OBJECT_URL);
  });

  test('When the component unmounts while the thumbnail is still downloading, then the object URL is revoked on arrival', async () => {
    let resolveDownload: (blob: Blob) => void = () => undefined;
    vi.mocked(downloadPublicThumbnail).mockReturnValue(
      new Promise<Blob>((resolve) => {
        resolveDownload = resolve;
      }),
    );

    const { unmount } = renderList([createItem()]);
    await waitFor(() => expect(downloadPublicThumbnail).toHaveBeenCalled());

    unmount();
    resolveDownload(new Blob(['thumbnail-bytes']));

    await waitFor(() => expect(URL.revokeObjectURL).toHaveBeenCalledWith(OBJECT_URL));
  });

  test('When the item name is clicked, then onItemDoubleClicked receives the item', () => {
    const item = createItem();
    const { getByTitle, onItemDoubleClicked } = renderList([item]);

    fireEvent.click(getByTitle('photo.png'));

    expect(onItemDoubleClicked).toHaveBeenCalledWith(item);
  });
});
