/**
 * Builders for tiny synthetic JPEG and TIFF files used by the image preview tests,
 * so no binary fixtures need to live in the repository.
 */

export const JPEG_FRAME = { baseline: 0xc0, extendedSequential: 0xc1, lossless: 0xc3 };
export const TIFF_PHOTOMETRIC = { rgb: 2, colorFilterArray: 32803 };
export const TIFF_COMPRESSION = { none: 1, nikon: 34713 };
/** Pixels written by `buildTiff`: red grows from 0 to 255 left to right, green and blue are fixed. */
export const TIFF_PIXEL = { green: 20, blue: 200 };

const RGB_CHANNELS = 3;
const JPEG_MARKER_PREFIX = 0xff;

const uint16 = (value: number): number[] => [value >> 8, value & 0xff];

const jpegSegment = (marker: number, payload: number[]): number[] => [
  JPEG_MARKER_PREFIX,
  marker,
  ...uint16(payload.length + 2),
  ...payload,
];

export const concatBytes = (...chunks: Uint8Array[]): Uint8Array<ArrayBuffer> => {
  const result = new Uint8Array(chunks.reduce((total, chunk) => total + chunk.length, 0));
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
};

export const asciiBytes = (text: string): number[] => Array.from(new TextEncoder().encode(text));

export const buildBmffBox = (type: string, payload: Uint8Array): Uint8Array<ArrayBuffer> => {
  const header = new Uint8Array(8);
  new DataView(header.buffer).setUint32(0, header.length + payload.length);
  header.set(asciiBytes(type), 4);
  return concatBytes(header, payload);
};

interface JpegOptions {
  width: number;
  height: number;
  frameMarker?: number;
  precision?: number;
  components?: number;
  hasEndOfImage?: boolean;
}

/** Builds a structurally valid JPEG (markers only, dummy scan data) with the given frame header. */
export const buildJpeg = ({
  width,
  height,
  frameMarker = JPEG_FRAME.baseline,
  precision = 8,
  components = 3,
  hasEndOfImage = true,
}: JpegOptions): Uint8Array<ArrayBuffer> => {
  const componentSpecs = Array.from({ length: components }, (_, index) => [index + 1, 0x11, 0]).flat();
  const scanData = [0x12, 0x34, 0xff, 0x00, 0x56, 0xff, 0xd0, 0x78, 0x9a];

  return Uint8Array.from([
    0xff,
    0xd8,
    ...jpegSegment(0xe0, [0x4a, 0x46, 0x49, 0x46, 0x00]),
    ...jpegSegment(frameMarker, [precision, ...uint16(height), ...uint16(width), components, ...componentSpecs]),
    ...jpegSegment(0xda, [components, 1, 0, 0, 63, 0]),
    ...scanData,
    ...(hasEndOfImage ? [0xff, 0xd9] : []),
  ]);
};

/** Reads width and height from the first frame header of a JPEG. */
export const readJpegDimensions = (bytes: Uint8Array): { width: number; height: number } | null => {
  for (
    let position = 2;
    position + 9 < bytes.length;
    position += 2 + ((bytes[position + 2] << 8) | bytes[position + 3])
  ) {
    const isFrameHeader = [JPEG_FRAME.baseline, JPEG_FRAME.extendedSequential, 0xc2].includes(bytes[position + 1]);
    if (isFrameHeader) {
      return {
        height: (bytes[position + 5] << 8) | bytes[position + 6],
        width: (bytes[position + 7] << 8) | bytes[position + 8],
      };
    }
  }
  return null;
};

export interface TiffPage {
  width: number;
  height: number;
  photometric?: number;
  compression?: number;
  orientation?: number;
}

type TiffEntry = [tag: number, type: number, count: number, value: number];

const TIFF_ENTRY_SIZE = 12;
const TIFF_BITS_PER_SAMPLE_SIZE = 6;
const SHORT = 3;
const LONG = 4;

const tiffEntries = (page: TiffPage, bitsOffset: number, pixelsOffset: number): TiffEntry[] => {
  const { width, height, photometric = TIFF_PHOTOMETRIC.rgb, compression = TIFF_COMPRESSION.none, orientation } = page;
  const orientationEntry: TiffEntry[] = orientation === undefined ? [] : [[274, SHORT, 1, orientation]];

  return [
    [256, LONG, 1, width],
    [257, LONG, 1, height],
    [258, SHORT, RGB_CHANNELS, bitsOffset],
    [259, SHORT, 1, compression],
    [262, SHORT, 1, photometric],
    [273, LONG, 1, pixelsOffset],
    ...orientationEntry,
    [277, SHORT, 1, RGB_CHANNELS],
    [278, LONG, 1, height],
    [279, LONG, 1, width * height * RGB_CHANNELS],
  ];
};

const tiffIfdSize = (page: TiffPage): number => 2 + tiffEntries(page, 0, 0).length * TIFF_ENTRY_SIZE + 4;

const writeTiffPage = (view: DataView, bytes: Uint8Array, ifdOffset: number, page: TiffPage, nextIfdOffset: number) => {
  const { width, height } = page;
  const bitsOffset = ifdOffset + tiffIfdSize(page);
  const pixelsOffset = bitsOffset + TIFF_BITS_PER_SAMPLE_SIZE;
  const entries = tiffEntries(page, bitsOffset, pixelsOffset);

  view.setUint16(ifdOffset, entries.length);
  entries.forEach(([tag, type, count, value], index) => {
    const entryOffset = ifdOffset + 2 + index * TIFF_ENTRY_SIZE;
    const isInlineShort = type === SHORT && count === 1;
    view.setUint16(entryOffset, tag);
    view.setUint16(entryOffset + 2, type);
    view.setUint32(entryOffset + 4, count);
    if (isInlineShort) view.setUint16(entryOffset + 8, value);
    else view.setUint32(entryOffset + 8, value);
  });
  view.setUint32(ifdOffset + 2 + entries.length * TIFF_ENTRY_SIZE, nextIfdOffset);
  [0, 2, 4].forEach((offset) => view.setUint16(bitsOffset + offset, 8));

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const offset = pixelsOffset + (y * width + x) * RGB_CHANNELS;
      bytes[offset] = Math.round((x * 255) / Math.max(width - 1, 1));
      bytes[offset + 1] = TIFF_PIXEL.green;
      bytes[offset + 2] = TIFF_PIXEL.blue;
    }
  }
};

/** Builds a big-endian, uncompressed RGB TIFF with one single-strip page per entry. */
export const buildTiff = (pages: TiffPage[]): ArrayBuffer => {
  const pageSize = (page: TiffPage) =>
    tiffIfdSize(page) + TIFF_BITS_PER_SAMPLE_SIZE + page.width * page.height * RGB_CHANNELS;
  const buffer = new ArrayBuffer(8 + pages.reduce((total, page) => total + pageSize(page), 0));
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);

  bytes.set([0x4d, 0x4d, 0x00, 0x2a]);
  view.setUint32(4, 8);

  let ifdOffset = 8;
  pages.forEach((page, index) => {
    const isLastPage = index === pages.length - 1;
    const nextIfdOffset = isLastPage ? 0 : ifdOffset + pageSize(page);
    writeTiffPage(view, bytes, ifdOffset, page, nextIfdOffset);
    ifdOffset = nextIfdOffset;
  });

  return buffer;
};
