import UTIF from 'utif2';
import { MARKER_PREFIX, MARKER_SIZE } from './embeddedJpeg';
import { hasTiffSignature, readTag, TIFF_TAG } from './tiffDecoder';

const asciiBytes = (text: string): number[] => [...text].map((char) => char.charCodeAt(0));

const NORMAL_ORIENTATION = 1;
const MAX_ORIENTATION = 8;
const APP1_MARKER = 0xe1;
const APP1_LENGTH_FIELD_SIZE = 2;
const EXIF_HEADER = asciiBytes('Exif\0\0');
const LITTLE_ENDIAN_TIFF_HEADER = [0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00];
const IS_LITTLE_ENDIAN = true;
const ORIENTATION_TAG_ID = 0x0112;
const SHORT_TYPE = 3;
const SINGLE_VALUE = 1;
const IFD_ENTRY_COUNT_SIZE = 2;
const IFD_ENTRY_SIZE = 12;
const IFD_ENTRY_OFFSET = { type: 2, count: 4, value: 8 };
const NEXT_IFD_OFFSET_SIZE = 4;
const APP1_SEGMENT_LENGTH =
  APP1_LENGTH_FIELD_SIZE +
  EXIF_HEADER.length +
  LITTLE_ENDIAN_TIFF_HEADER.length +
  IFD_ENTRY_COUNT_SIZE +
  IFD_ENTRY_SIZE +
  NEXT_IFD_OFFSET_SIZE;
const BMFF_BOX_SIZE_SIZE = 4;
const BMFF_BOX_TYPE_OFFSET = BMFF_BOX_SIZE_SIZE;
const FILE_TYPE_BOX = asciiBytes('ftyp');
const CANON_METADATA_BOX = asciiBytes('CMT1');
const BMFF_SEARCH_LIMIT_BYTES = 1024 * 1024;

const matchesAt = (bytes: Uint8Array, position: number, pattern: number[]): boolean =>
  pattern.every((byte, index) => bytes[position + index] === byte);

const readFirstPageOrientation = (buffer: ArrayBuffer): number | undefined => {
  try {
    const [firstPage] = UTIF.decode(buffer);
    const orientation = readTag(firstPage, TIFF_TAG.orientation);
    return Number.isNaN(orientation) ? undefined : orientation;
  } catch {
    return undefined;
  }
};

const readCr3Orientation = (buffer: ArrayBuffer, bytes: Uint8Array): number | undefined => {
  const lastPosition = Math.min(bytes.length, BMFF_SEARCH_LIMIT_BYTES) - CANON_METADATA_BOX.length;

  for (let position = BMFF_BOX_TYPE_OFFSET; position <= lastPosition; position++) {
    if (matchesAt(bytes, position, CANON_METADATA_BOX)) {
      const boxStart = position - BMFF_BOX_TYPE_OFFSET;
      const boxEnd = boxStart + new DataView(buffer).getUint32(boxStart);
      return readFirstPageOrientation(buffer.slice(position + CANON_METADATA_BOX.length, boxEnd));
    }
  }

  return undefined;
};

export const readContainerOrientation = (buffer: ArrayBuffer): number | undefined => {
  const bytes = new Uint8Array(buffer);
  if (hasTiffSignature(bytes)) return readFirstPageOrientation(buffer);
  if (matchesAt(bytes, BMFF_BOX_TYPE_OFFSET, FILE_TYPE_BOX)) return readCr3Orientation(buffer, bytes);
  return undefined;
};

const buildOrientationSegment = (orientation: number): Uint8Array => {
  const segment = new Uint8Array(MARKER_SIZE + APP1_SEGMENT_LENGTH);
  const view = new DataView(segment.buffer);
  const exifOffset = MARKER_SIZE + APP1_LENGTH_FIELD_SIZE;
  const tiffOffset = exifOffset + EXIF_HEADER.length;
  const ifdOffset = tiffOffset + LITTLE_ENDIAN_TIFF_HEADER.length;
  const entryOffset = ifdOffset + IFD_ENTRY_COUNT_SIZE;

  segment.set([MARKER_PREFIX, APP1_MARKER]);
  view.setUint16(MARKER_SIZE, APP1_SEGMENT_LENGTH);
  segment.set(EXIF_HEADER, exifOffset);
  segment.set(LITTLE_ENDIAN_TIFF_HEADER, tiffOffset);
  view.setUint16(ifdOffset, SINGLE_VALUE, IS_LITTLE_ENDIAN);
  view.setUint16(entryOffset, ORIENTATION_TAG_ID, IS_LITTLE_ENDIAN);
  view.setUint16(entryOffset + IFD_ENTRY_OFFSET.type, SHORT_TYPE, IS_LITTLE_ENDIAN);
  view.setUint32(entryOffset + IFD_ENTRY_OFFSET.count, SINGLE_VALUE, IS_LITTLE_ENDIAN);
  view.setUint16(entryOffset + IFD_ENTRY_OFFSET.value, orientation, IS_LITTLE_ENDIAN);

  return segment;
};

export const applyExifOrientation = (
  jpeg: Uint8Array<ArrayBuffer>,
  orientation: number | undefined,
): Uint8Array<ArrayBuffer> => {
  const hasNonNormalOrientation =
    orientation !== undefined && orientation > NORMAL_ORIENTATION && orientation <= MAX_ORIENTATION;
  if (!hasNonNormalOrientation) return jpeg;

  const segment = buildOrientationSegment(orientation);
  const result = new Uint8Array(jpeg.length + segment.length);
  result.set(jpeg.subarray(0, MARKER_SIZE));
  result.set(segment, MARKER_SIZE);
  result.set(jpeg.subarray(MARKER_SIZE), MARKER_SIZE + segment.length);

  return result;
};
