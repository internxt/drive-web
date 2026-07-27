import { Thumbnail } from '@internxt/sdk/dist/drive/storage/types';
import { fireEvent, render, waitFor } from '@testing-library/react';
import { downloadPublicThumbnail } from 'app/drive/services/thumbnail.service';
import { AdvancedSharedItem } from 'app/share/types';
import errorService from 'services/error.service';
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
      expect.any(AbortController),
    );
  });

  test('When the item is a folder or a file type without thumbnail support, then the type icon is shown and no thumbnail is downloaded', () => {
    const folder = createItem({ id: 2, uuid: 'folder-uuid', plainName: 'docs', type: undefined, isFolder: true });
    const zip = createItem({ id: 3, uuid: 'zip-uuid', plainName: 'bundle', type: 'zip' });

    const { container } = renderList([folder, zip]);

    expect(downloadPublicThumbnail).not.toHaveBeenCalled();
    expect(container.querySelector('img[src="blob:mock-thumbnail-url"]')).toBeNull();
  });

  test('When a pdf or video item has a thumbnail and credentials, then the thumbnail is downloaded', async () => {
    vi.mocked(downloadPublicThumbnail).mockResolvedValue(new Blob(['thumbnail-bytes']));

    const pdf = createItem({ id: 4, uuid: 'pdf-uuid', plainName: 'report', type: 'pdf' });
    const video = createItem({ id: 5, uuid: 'video-uuid', plainName: 'clip', type: 'mp4' });

    const { findByAltText } = renderList([pdf, video]);

    await findByAltText('report.pdf');
    await findByAltText('clip.mp4');
    expect(downloadPublicThumbnail).toHaveBeenCalledTimes(2);
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
    const abortController = vi.mocked(downloadPublicThumbnail).mock.calls[0][3] as AbortController;

    unmount();
    resolveDownload(new Blob(['thumbnail-bytes']));

    expect(abortController.signal.aborted).toBe(true);
    await waitFor(() => expect(URL.revokeObjectURL).toHaveBeenCalledWith(OBJECT_URL));
  });

  test('When the thumbnail download fails, then the error is reported', async () => {
    const downloadError = new Error('download failed');
    vi.mocked(downloadPublicThumbnail).mockRejectedValue(downloadError);

    renderList([createItem()]);

    await waitFor(() => expect(errorService.reportError).toHaveBeenCalledWith(downloadError));
  });

  test('When the download is aborted by unmounting, then the rejection is not reported as an error', async () => {
    let rejectDownload: (error: Error) => void = () => undefined;
    vi.mocked(downloadPublicThumbnail).mockReturnValue(
      new Promise<Blob>((_, reject) => {
        rejectDownload = reject;
      }),
    );

    const { unmount } = renderList([createItem()]);
    await waitFor(() => expect(downloadPublicThumbnail).toHaveBeenCalled());

    unmount();
    rejectDownload(new Error('aborted'));

    await new Promise((resolve) => setTimeout(resolve));
    expect(errorService.reportError).not.toHaveBeenCalled();
  });

  test('When the item name is clicked, then onItemDoubleClicked receives the item', () => {
    const item = createItem();
    const { getByTitle, onItemDoubleClicked } = renderList([item]);

    fireEvent.click(getByTitle('photo.png'));

    expect(onItemDoubleClicked).toHaveBeenCalledWith(item);
  });
});
