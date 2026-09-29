import { Thumbnail } from '@internxt/sdk/dist/drive/storage/types';
import { render, screen, waitFor } from '@testing-library/react';
import { buildTiff, concatBytes } from 'testUtils/imageBuilders';
import { beforeAll, describe, expect, test, vi } from 'vitest';
import { PreviewFileItem } from 'app/share/types';
import FileImageViewer from './FileImageViewer';

const { heic2anyMock } = vi.hoisted(() => ({ heic2anyMock: vi.fn() }));

vi.mock('heic2any', () => ({ __esModule: true, default: heic2anyMock }));
vi.mock('app/i18n/provider/TranslationProvider', () => ({
  useTranslationContext: () => ({ translate: (key: string) => key }),
}));

const IMAGE_WIDTH = 64;
const IMAGE_HEIGHT = 48;
const FILE_NAME = 'photo';
const ROTATED_90_CW = 6;
const RAW_PADDING = new Uint8Array(3000);
const EXISTING_THUMBNAIL: Thumbnail = {
  id: 1,
  file_id: 1,
  max_width: 300,
  max_height: 300,
  type: 'png',
  size: 1024,
  bucket_id: 'bucket',
  bucket_file: 'bucket-file',
  encrypt_version: '03-aes',
};

const file = (type: string, thumbnails: Thumbnail[] = []): PreviewFileItem =>
  ({
    id: 1,
    name: FILE_NAME,
    plainName: FILE_NAME,
    type,
    size: 1024,
    folderUuid: 'folder',
    thumbnails,
  }) as unknown as PreviewFileItem;

const createHandlers = () => ({
  handleUpdateProgress: vi.fn(),
  handleUpdateThumbnail: vi.fn().mockResolvedValue(undefined),
});

/** Encodes a real JPEG with the browser so the viewer can render it. */
const createJpegBytes = (): Promise<Uint8Array<ArrayBuffer>> =>
  new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    canvas.width = IMAGE_WIDTH;
    canvas.height = IMAGE_HEIGHT;
    canvas.toBlob(async (blob) => resolve(new Uint8Array(await (blob as Blob).arrayBuffer())), 'image/jpeg');
  });

const waitForLoadedImage = async (expectedWidth = IMAGE_WIDTH): Promise<HTMLImageElement> => {
  const image = (await screen.findByAltText(FILE_NAME)) as HTMLImageElement;
  await waitFor(() => expect(image.naturalWidth).toBe(expectedWidth));
  return image;
};

describe('FileImageViewer', () => {
  let jpegBytes: Uint8Array<ArrayBuffer>;
  const tiffBlob = new Blob([buildTiff([{ width: IMAGE_WIDTH, height: IMAGE_HEIGHT }])]);

  beforeAll(async () => {
    jpegBytes = await createJpegBytes();
  });

  test('when a TIFF file is opened, then a converted image is shown and its thumbnail is generated', async () => {
    const handlers = createHandlers();
    const setIsPreviewAvailable = vi.fn();

    render(
      <FileImageViewer
        file={file('tif')}
        blob={tiffBlob}
        handlersForSpecialItems={handlers}
        setIsPreviewAvailable={setIsPreviewAvailable}
      />,
    );

    const image = await waitForLoadedImage();
    expect(image.naturalHeight).toBe(IMAGE_HEIGHT);
    expect(handlers.handleUpdateProgress.mock.calls).toEqual([[0.95], [1]]);
    await waitFor(() =>
      expect(handlers.handleUpdateThumbnail).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'jpg' }),
        expect.any(Blob),
      ),
    );
    expect(setIsPreviewAvailable).not.toHaveBeenCalledWith(false);
  });

  test('when the file already has a thumbnail, then no thumbnail is regenerated after conversion', async () => {
    const handlers = createHandlers();

    render(
      <FileImageViewer
        file={file('tif', [EXISTING_THUMBNAIL])}
        blob={tiffBlob}
        handlersForSpecialItems={handlers}
        setIsPreviewAvailable={vi.fn()}
      />,
    );

    await waitForLoadedImage();
    await waitFor(() => expect(handlers.handleUpdateProgress).toHaveBeenLastCalledWith(1));
    expect(handlers.handleUpdateThumbnail).not.toHaveBeenCalled();
  });

  test('when a RAW file embeds a JPEG preview, then that preview is shown without altering the original blob', async () => {
    const handlers = createHandlers();
    const originalBlob = new Blob([concatBytes(RAW_PADDING, jpegBytes, RAW_PADDING)]);
    const originalSize = originalBlob.size;

    render(
      <FileImageViewer
        file={file('CR2')}
        blob={originalBlob}
        handlersForSpecialItems={handlers}
        setIsPreviewAvailable={vi.fn()}
      />,
    );

    await waitForLoadedImage();
    expect(originalBlob.size).toBe(originalSize);
    await waitFor(() => expect(handlers.handleUpdateThumbnail).toHaveBeenCalled());
    const [, thumbnailSource] = handlers.handleUpdateThumbnail.mock.calls[0];
    expect((thumbnailSource as Blob).size).toBe(jpegBytes.length);
  });

  test('when a RAW file was shot in portrait, then the preview is shown rotated like the camera intended', async () => {
    const container = new Uint8Array(buildTiff([{ width: 8, height: 8, orientation: ROTATED_90_CW }]));
    const rawBlob = new Blob([concatBytes(container, RAW_PADDING, jpegBytes, RAW_PADDING)]);

    render(
      <FileImageViewer
        file={file('nef')}
        blob={rawBlob}
        handlersForSpecialItems={createHandlers()}
        setIsPreviewAvailable={vi.fn()}
      />,
    );

    const image = await waitForLoadedImage(IMAGE_HEIGHT);
    expect(image.naturalHeight).toBe(IMAGE_WIDTH);
  });

  test('when a HEIC file is opened, then it is converted with heic2any as before', async () => {
    const handlers = createHandlers();
    heic2anyMock.mockResolvedValue(new Blob([jpegBytes], { type: 'image/png' }));

    render(
      <FileImageViewer
        file={file('heic')}
        blob={new Blob(['heic'])}
        handlersForSpecialItems={handlers}
        setIsPreviewAvailable={vi.fn()}
      />,
    );

    await waitForLoadedImage();
    await waitFor(() =>
      expect(handlers.handleUpdateThumbnail).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'png' }),
        expect.any(Blob),
      ),
    );
  });

  test('when a RAW file has no usable preview, then the unsupported fallback is triggered', async () => {
    const handlers = createHandlers();
    const setIsPreviewAvailable = vi.fn();

    render(
      <FileImageViewer
        file={file('nef')}
        blob={new Blob([new Uint8Array(4096)])}
        handlersForSpecialItems={handlers}
        setIsPreviewAvailable={setIsPreviewAvailable}
      />,
    );

    await waitFor(() => expect(setIsPreviewAvailable).toHaveBeenCalledWith(false));
    expect(handlers.handleUpdateProgress).toHaveBeenLastCalledWith(1);
    expect(handlers.handleUpdateThumbnail).not.toHaveBeenCalled();
    expect(screen.queryByAltText(FILE_NAME)).not.toBeInTheDocument();
  });

  test('when a natively supported image is opened, then it is shown as-is without conversion', async () => {
    const handlers = createHandlers();

    render(
      <FileImageViewer
        file={file('jpg')}
        blob={new Blob([jpegBytes])}
        handlersForSpecialItems={handlers}
        setIsPreviewAvailable={vi.fn()}
      />,
    );

    await waitForLoadedImage();
    expect(handlers.handleUpdateProgress).not.toHaveBeenCalled();
    expect(handlers.handleUpdateThumbnail).not.toHaveBeenCalled();
  });

  test('when there is no blob, then the preview is marked unavailable', () => {
    const setIsPreviewAvailable = vi.fn();

    render(<FileImageViewer file={file('png')} blob={null} setIsPreviewAvailable={setIsPreviewAvailable} />);

    expect(setIsPreviewAvailable).toHaveBeenCalledWith(false);
  });

  test('when no progress handlers are provided (public share), then a local loader is shown until the image is ready', async () => {
    render(<FileImageViewer file={file('tiff')} blob={tiffBlob} setIsPreviewAvailable={vi.fn()} />);

    expect(screen.getByTestId('image-conversion-loader')).toBeInTheDocument();
    await waitForLoadedImage();
    expect(screen.queryByTestId('image-conversion-loader')).not.toBeInTheDocument();
  });
});
