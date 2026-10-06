import { expect, Page, test } from '@playwright/test';
import { readFileSync } from 'fs';
import { MAX_CONVERTIBLE_IMAGE_PREVIEW_BYTES } from 'app/drive/components/FileViewer/utils/fileViewerUtils';
import { buildTiff, concatBytes } from 'testUtils/imageBuilders';
import { MockedDriveOptions } from '../helper/driveRouteMocks';
import { openMockedDrive } from '../helper/mockedDrive';
import { UploadFile } from '../pages/drivePage';
import { FilePreviewPage, ImageSize } from '../pages/filePreviewPage';

const IMAGE_SIZE: ImageSize = { width: 640, height: 480 };
const TIFF_FILE = { plainName: 'landscape', extension: 'tiff', mimeType: 'image/tiff' };
const OVERSIZED_TIFF_FILE = { plainName: 'satellite-mosaic', extension: 'tiff', mimeType: 'image/tiff' };
/** Size the mocked drive reports for the oversized TIFF; the bytes actually uploaded are a small TIFF. */
const OVERSIZED_TIFF_DECLARED_BYTES = MAX_CONVERTIBLE_IMAGE_PREVIEW_BYTES + 1;
const RAW_FILE_WITH_PREVIEW = { plainName: 'camera-shot', extension: 'cr2', mimeType: 'image/x-canon-cr2' };
const RAW_FILE_WITHOUT_PREVIEW = { plainName: 'blank', extension: 'nef', mimeType: 'image/x-nikon-nef' };
const EMBEDDED_PREVIEW = { mimeType: 'image/jpeg', quality: 0.9, fillColor: '#3366cc' };
const TIFF_LITTLE_ENDIAN_HEADER = Uint8Array.from([0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00]);
const RAW_PADDING_BEFORE_PREVIEW = 2048;
const RAW_PADDING_AFTER_PREVIEW = 4096;
const UNSUPPORTED_RAW_SIZE = 4096;
const THUMBNAIL_TYPE = 'png';
const THUMBNAIL_TIMEOUT = 30000;

type FileKind = typeof TIFF_FILE;

const buildZeroBytes = (length: number) => new Uint8Array(length);

const buildUpload = ({ plainName, extension, mimeType }: FileKind, content: Uint8Array): UploadFile => ({
  name: `${plainName}.${extension}`,
  mimeType,
  buffer: Buffer.from(content),
});

/** A valid big-endian RGB TIFF built in memory; nothing binary is committed to the repo. */
const buildTiffUpload = (file: FileKind = TIFF_FILE) => buildUpload(file, new Uint8Array(buildTiff([IMAGE_SIZE])));

/** A RAW-like file: TIFF header, opaque padding, the embedded JPEG preview, more padding. */
const buildRawUploadWithPreview = (jpeg: Uint8Array) =>
  buildUpload(
    RAW_FILE_WITH_PREVIEW,
    concatBytes(
      TIFF_LITTLE_ENDIAN_HEADER,
      buildZeroBytes(RAW_PADDING_BEFORE_PREVIEW),
      jpeg,
      buildZeroBytes(RAW_PADDING_AFTER_PREVIEW),
    ),
  );

/** A RAW file with no JPEG inside, so nothing displayable can be extracted. */
const buildRawUploadWithoutPreview = () => buildUpload(RAW_FILE_WITHOUT_PREVIEW, buildZeroBytes(UNSUPPORTED_RAW_SIZE));

/** A real JPEG encoded by the browser's canvas, so the RAW wrapper carries a decodable preview. */
const renderJpegInBrowser = async (page: Page): Promise<Uint8Array> => {
  const base64 = await page.evaluate(
    async ({ width, height, mimeType, quality, fillColor }) => {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Canvas 2D context unavailable');
      context.fillStyle = fillColor;
      context.fillRect(0, 0, width, height);

      const blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob(
          (encoded) => (encoded ? resolve(encoded) : reject(new Error('toBlob failed'))),
          mimeType,
          quality,
        ),
      );
      const bytes = new Uint8Array(await blob.arrayBuffer());
      let binary = '';
      for (const byte of bytes) binary += String.fromCharCode(byte);
      return btoa(binary);
    },
    { ...IMAGE_SIZE, ...EMBEDDED_PREVIEW },
  );

  return new Uint8Array(Buffer.from(base64, 'base64'));
};

/**
 * Chromium exposes `showSaveFilePicker`, which opens a native picker Playwright cannot
 * observe. Reporting the browser as Brave makes the app save through `saveAs`, which
 * emits the `download` event. Only the sink changes; fetch + decrypt are the real ones.
 */
const saveDownloadsThroughSaveAs = (page: Page) =>
  page.addInitScript(() => {
    Object.defineProperty(navigator, 'brave', { value: { isBrave: async () => true } });
  });

/**
 * Logs in to an empty mocked Drive, uploads the file, opens it once it is listed and
 * waits for the file viewer.
 */
const uploadAndOpen = async (page: Page, file: UploadFile, options?: MockedDriveOptions) => {
  const { drivePage, requests } = await openMockedDrive(page, options);
  const preview = new FilePreviewPage(page);

  await drivePage.uploadFiles([file]);
  await drivePage.openFile(file.name);
  await preview.expectOpen();

  return { drivePage, preview, requests };
};

test.describe('Internxt RAW/TIFF image preview', () => {
  test.use({ storageState: { cookies: [], origins: [] } });
  test.skip(({ browserName }) => browserName !== 'chromium', 'bridge relay (upload worker PUT) is Chromium-only');

  test('when a TIFF file is uploaded and opened, then the viewer shows the converted image', async ({ page }) => {
    const { preview } = await uploadAndOpen(page, buildTiffUpload());

    await preview.expectRenderedImage(TIFF_FILE.plainName, IMAGE_SIZE);
  });

  test('when a RAW file with an embedded JPEG preview is opened, then the embedded preview is shown', async ({
    page,
  }) => {
    const file = buildRawUploadWithPreview(await renderJpegInBrowser(page));

    const { preview } = await uploadAndOpen(page, file);

    await preview.expectRenderedImage(RAW_FILE_WITH_PREVIEW.plainName, IMAGE_SIZE);
  });

  test('when a TIFF is larger than the preview size limit, then a too-large fallback is shown without fetching the file', async ({
    page,
  }) => {
    const file = buildTiffUpload(OVERSIZED_TIFF_FILE);
    const declaredSizes = { [OVERSIZED_TIFF_FILE.plainName]: OVERSIZED_TIFF_DECLARED_BYTES };

    const { preview, requests } = await uploadAndOpen(page, file, { declaredSizes });

    await preview.expectTooLargeFallback(OVERSIZED_TIFF_FILE.plainName);
    expect(requests.fileEntries).toMatchObject([{ plainName: OVERSIZED_TIFF_FILE.plainName }]);
    expect(requests.downloadedFileIds).not.toContain(requests.fileEntries[0].fileId);
  });

  test('when a RAW file without a usable preview is opened, then the no-preview fallback with download is shown', async ({
    page,
  }) => {
    const { preview } = await uploadAndOpen(page, buildRawUploadWithoutPreview());

    await preview.expectNoPreviewFallback(RAW_FILE_WITHOUT_PREVIEW.plainName);
  });

  test('when a previewed TIFF is downloaded afterwards, then the downloaded file is identical to the uploaded one', async ({
    page,
  }) => {
    await saveDownloadsThroughSaveAs(page);
    const file = buildTiffUpload();
    const { preview, requests } = await uploadAndOpen(page, file);
    await preview.expectRenderedImage(TIFF_FILE.plainName, IMAGE_SIZE);

    const download = await preview.downloadFromTopBar();

    expect(download.suggestedFilename()).toBe(file.name);
    expect(readFileSync(await download.path()).equals(file.buffer)).toBe(true);
    expect(requests.fileEntries).toMatchObject([
      { plainName: TIFF_FILE.plainName, type: TIFF_FILE.extension, size: file.buffer.length },
    ]);
    expect(requests.downloadedFileIds).toContain(requests.fileEntries[0].fileId);
    await download.delete();
  });

  test('when a TIFF has been previewed, then its list item shows the generated thumbnail', async ({ page }) => {
    const file = buildTiffUpload();
    const { drivePage, preview, requests } = await uploadAndOpen(page, file);
    await preview.expectRenderedImage(TIFF_FILE.plainName, IMAGE_SIZE);

    await expect.poll(() => requests.thumbnailEntries.length, { timeout: THUMBNAIL_TIMEOUT }).toBe(1);
    await preview.close();

    await drivePage.expectFileThumbnail(file.name);
    expect(requests.thumbnailEntries[0].type).toBe(THUMBNAIL_TYPE);
  });
});
