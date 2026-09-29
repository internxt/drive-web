import { buildTiff, TIFF_COMPRESSION, TIFF_PHOTOMETRIC, TIFF_PIXEL } from 'testUtils/imageBuilders';
import { describe, expect, test } from 'vitest';
import { decodeTiffToRgba, hasTiffSignature, MAX_PREVIEW_PIXELS, RgbaImage } from './tiffDecoder';

const OPAQUE = 255;

const pixelAt = ({ width, data }: RgbaImage, x: number, y: number): number[] =>
  Array.from(data.subarray((y * width + x) * 4, (y * width + x) * 4 + 4));

const expectGradientEdges = (image: RgbaImage, tolerance = 0) => {
  const leftEdge = pixelAt(image, 0, 0);
  const rightEdge = pixelAt(image, image.width - 1, image.height - 1);

  expect(Math.abs(leftEdge[0] - 0)).toBeLessThanOrEqual(tolerance);
  expect(Math.abs(rightEdge[0] - 255)).toBeLessThanOrEqual(tolerance);
  expect(leftEdge.slice(1)).toEqual([TIFF_PIXEL.green, TIFF_PIXEL.blue, OPAQUE]);
  expect(rightEdge.slice(1)).toEqual([TIFF_PIXEL.green, TIFF_PIXEL.blue, OPAQUE]);
};

describe('decodeTiffToRgba', () => {
  test('when decoding an RGB TIFF, then it yields its pixels as RGBA', () => {
    const image = decodeTiffToRgba(buildTiff([{ width: 10, height: 4 }])) as RgbaImage;

    expect([image.width, image.height]).toEqual([10, 4]);
    expectGradientEdges(image);
  });

  test('when the TIFF has several pages, then the largest displayable one is used', () => {
    const pages = [
      { width: 8, height: 8 },
      { width: 40, height: 30, photometric: TIFF_PHOTOMETRIC.colorFilterArray },
      { width: 20, height: 10 },
    ];

    const image = decodeTiffToRgba(buildTiff(pages)) as RgbaImage;

    expect([image.width, image.height]).toEqual([20, 10]);
  });

  test('when the image exceeds the pixel budget, then it is downsampled while keeping its colours', () => {
    const image = decodeTiffToRgba(buildTiff([{ width: 64, height: 32 }]), 512) as RgbaImage;

    expect([image.width, image.height]).toEqual([32, 16]);
    expectGradientEdges(image, 3);
  });

  test('when decoding a high-resolution 6000x4000 TIFF, then the preview stays within the default budget', () => {
    const image = decodeTiffToRgba(buildTiff([{ width: 6000, height: 4000 }])) as RgbaImage;

    expect(image.width * image.height).toBeLessThanOrEqual(MAX_PREVIEW_PIXELS);
    expect([image.width, image.height]).toEqual([3000, 2000]);
    expectGradientEdges(image, 1);
  });

  test('when no page is displayable (raw sensor data or unsupported compression), then it returns null', () => {
    const rawSensorPage = buildTiff([{ width: 8, height: 8, photometric: TIFF_PHOTOMETRIC.colorFilterArray }]);
    const nikonCompressedPage = buildTiff([{ width: 8, height: 8, compression: TIFF_COMPRESSION.nikon }]);

    expect(decodeTiffToRgba(rawSensorPage)).toBeNull();
    expect(decodeTiffToRgba(nikonCompressedPage)).toBeNull();
  });
});

describe('hasTiffSignature', () => {
  test('when bytes start with the TIFF byte-order mark, then it is considered TIFF-like', () => {
    expect(hasTiffSignature(new Uint8Array(buildTiff([{ width: 2, height: 2 }])))).toBe(true);
    expect(hasTiffSignature(Uint8Array.from([0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00]))).toBe(true);
    expect(hasTiffSignature(Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0]))).toBe(false);
    expect(hasTiffSignature(new Uint8Array(4))).toBe(false);
  });
});
