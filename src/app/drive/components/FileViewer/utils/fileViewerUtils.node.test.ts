import { describe, expect, test } from 'vitest';
import { HALF_A_GIGABYTE_IN_BYTES } from 'services/media.service';
import { MAX_CONVERTIBLE_IMAGE_PREVIEW_BYTES, getPreviewSizeLimitBytes, isPreviewableBySize } from './fileViewerUtils';

const isPreviewable = (type: string, size: number) => isPreviewableBySize({ type, size });

describe('isPreviewableBySize', () => {
  test.each(['tiff', 'TIF', 'cr2', 'heic'])(
    'when a %s is at or above the conversion cap, then it is not previewable',
    (type) => {
      expect(isPreviewable(type, MAX_CONVERTIBLE_IMAGE_PREVIEW_BYTES)).toBe(false);
    },
  );

  test('when a TIFF is under the conversion cap, then it is previewable', () => {
    expect(isPreviewable('tiff', MAX_CONVERTIBLE_IMAGE_PREVIEW_BYTES - 1)).toBe(true);
  });

  test('when a JPG is above the conversion cap but under the general limit, then it is still previewable', () => {
    expect(isPreviewable('jpg', MAX_CONVERTIBLE_IMAGE_PREVIEW_BYTES + 1)).toBe(true);
  });
});

describe('getPreviewSizeLimitBytes', () => {
  test('when the file is a convertible image, then the limit is the conversion cap', () => {
    expect(getPreviewSizeLimitBytes({ type: 'tiff' })).toBe(MAX_CONVERTIBLE_IMAGE_PREVIEW_BYTES);
  });

  test('when the file is not a convertible image, then the limit is the general one', () => {
    expect(getPreviewSizeLimitBytes({ type: 'jpg' })).toBe(HALF_A_GIGABYTE_IN_BYTES);
  });
});
