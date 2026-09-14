import { buildJpeg, buildTiff, concatBytes } from 'testUtils/imageBuilders';
import { describe, expect, test } from 'vitest';
import { decodeImagePreview } from './decodeImagePreview';

const tiffHeader = Uint8Array.from([0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00]);
const preview = buildJpeg({ width: 1920, height: 1280 });

describe('decodeImagePreview', () => {
  test('when given a TIFF, then it decodes the page into RGBA pixels', () => {
    expect(decodeImagePreview(buildTiff([{ width: 16, height: 8 }]), 'tif')).toMatchObject({
      kind: 'rgba',
      width: 16,
      height: 8,
    });
  });

  test('when given a RAW container with an embedded JPEG preview, then it returns that JPEG untouched', () => {
    const rawFile = concatBytes(tiffHeader, new Uint8Array(2048), preview, new Uint8Array(4096)).buffer;

    expect(decodeImagePreview(rawFile, 'CR2')).toEqual({ kind: 'jpeg', bytes: preview });
  });

  test('when a RAW file has no JPEG preview but its pages are plain RGB, then it decodes them as TIFF', () => {
    expect(decodeImagePreview(buildTiff([{ width: 16, height: 8 }]), 'nef')).toMatchObject({ kind: 'rgba' });
  });

  test('when a TIFF cannot be decoded but embeds a JPEG, then the JPEG is used as fallback', () => {
    const brokenTiff = concatBytes(tiffHeader, new Uint8Array(64), preview).buffer;

    expect(decodeImagePreview(brokenTiff, 'tiff')).toEqual({ kind: 'jpeg', bytes: preview });
  });

  test('when the file holds nothing displayable, then it returns null', () => {
    expect(decodeImagePreview(new ArrayBuffer(1024), 'arw')).toBeNull();
    expect(decodeImagePreview(concatBytes(tiffHeader, new Uint8Array(512)).buffer, 'dng')).toBeNull();
    expect(decodeImagePreview(new ArrayBuffer(0), 'tif')).toBeNull();
  });
});
