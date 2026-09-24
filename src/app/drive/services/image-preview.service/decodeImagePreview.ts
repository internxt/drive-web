import { tiffImageExtensions } from 'app/drive/types/file-types';
import { findLargestEmbeddedJpeg } from './embeddedJpeg';
import { applyExifOrientation, readContainerOrientation } from './jpegOrientation';
import { decodeTiffToRgba, hasTiffSignature, RgbaImage } from './tiffDecoder';

export const PREVIEW_KIND = { jpeg: 'jpeg', rgba: 'rgba' } as const;

export type DecodedImagePreview =
  | { kind: typeof PREVIEW_KIND.jpeg; bytes: Uint8Array<ArrayBuffer> }
  | ({ kind: typeof PREVIEW_KIND.rgba } & RgbaImage);

const decodeTiff = (buffer: ArrayBuffer): DecodedImagePreview | null => {
  try {
    const image = decodeTiffToRgba(buffer);
    return image ? { kind: PREVIEW_KIND.rgba, ...image } : null;
  } catch (error) {
    console.warn('TIFF decoding failed, trying the embedded JPEG instead', error);
    return null;
  }
};

const extractEmbeddedJpeg = (bytes: Uint8Array<ArrayBuffer>): DecodedImagePreview | null => {
  const jpeg = findLargestEmbeddedJpeg(bytes);
  if (!jpeg) return null;

  return { kind: PREVIEW_KIND.jpeg, bytes: applyExifOrientation(jpeg, readContainerOrientation(bytes.buffer)) };
};

export const decodeImagePreview = (buffer: ArrayBuffer, extension: string): DecodedImagePreview | null => {
  const bytes = new Uint8Array(buffer);
  const isTiff = tiffImageExtensions.includes(extension.toLowerCase());

  if (isTiff) return decodeTiff(buffer) ?? extractEmbeddedJpeg(bytes);

  return extractEmbeddedJpeg(bytes) ?? (hasTiffSignature(bytes) ? decodeTiff(buffer) : null);
};
