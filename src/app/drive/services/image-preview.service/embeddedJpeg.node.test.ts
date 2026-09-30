import { buildJpeg, concatBytes, JPEG_FRAME } from 'testUtils/imageBuilders';
import { describe, expect, test } from 'vitest';
import { findLargestEmbeddedJpeg } from './embeddedJpeg';

const noise = (length: number): Uint8Array => Uint8Array.from({ length }, (_, index) => (index * 37 + 11) & 0xff);

describe('findLargestEmbeddedJpeg', () => {
  test('when the bytes contain no JPEG, then it returns null', () => {
    expect(findLargestEmbeddedJpeg(noise(4096))).toBeNull();
    expect(findLargestEmbeddedJpeg(new Uint8Array(0))).toBeNull();
  });

  test('when a JPEG is surrounded by other bytes, then it returns exactly the JPEG bytes', () => {
    const jpeg = buildJpeg({ width: 640, height: 480 });

    expect(findLargestEmbeddedJpeg(concatBytes(noise(300), jpeg, noise(200)))).toEqual(jpeg);
  });

  test('when several JPEGs are embedded, then it returns the one with most pixels', () => {
    const small = buildJpeg({ width: 160, height: 120 });
    const large = buildJpeg({ width: 1920, height: 1280 });
    const medium = buildJpeg({ width: 800, height: 600 });

    expect(findLargestEmbeddedJpeg(concatBytes(small, noise(50), large, noise(50), medium))).toEqual(large);
  });

  test('when larger streams are not browser-decodable colour JPEGs, then they are ignored', () => {
    const preview = buildJpeg({ width: 1024, height: 768 });
    const losslessSensorData = buildJpeg({ width: 6000, height: 4000, frameMarker: JPEG_FRAME.lossless });
    const twelveBitTile = buildJpeg({
      width: 1952,
      height: 552,
      frameMarker: JPEG_FRAME.extendedSequential,
      precision: 12,
    });
    const grayscaleTile = buildJpeg({ width: 4000, height: 3000, components: 1 });

    const bytes = concatBytes(losslessSensorData, twelveBitTile, preview, grayscaleTile);

    expect(findLargestEmbeddedJpeg(bytes)).toEqual(preview);
  });

  test('when a stream is malformed or truncated, then it is skipped in favour of a complete one', () => {
    const truncated = buildJpeg({ width: 4000, height: 3000, hasEndOfImage: false });
    const interruptedByNewImage = concatBytes(truncated, buildJpeg({ width: 320, height: 240 }));
    const brokenSegment = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x00]);

    expect(findLargestEmbeddedJpeg(truncated)).toBeNull();
    expect(findLargestEmbeddedJpeg(interruptedByNewImage)).toEqual(buildJpeg({ width: 320, height: 240 }));
    expect(findLargestEmbeddedJpeg(brokenSegment)).toBeNull();
  });

  test('when the only stream is smaller than 64px, then it returns null', () => {
    expect(findLargestEmbeddedJpeg(buildJpeg({ width: 32, height: 24 }))).toBeNull();
  });
});
