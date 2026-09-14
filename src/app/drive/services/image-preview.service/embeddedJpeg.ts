const MARKER_PREFIX = 0xff;
const START_OF_IMAGE = 0xd8;
const END_OF_IMAGE = 0xd9;
const START_OF_SCAN = 0xda;
const BROWSER_DECODABLE_FRAMES = new Set([0xc0, 0xc1, 0xc2]);
const OTHER_FRAME_MARKERS = new Set([0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]);
const STANDALONE_MARKERS = new Set([0x01, 0xd0, 0xd1, 0xd2, 0xd3, 0xd4, 0xd5, 0xd6, 0xd7]);
const EIGHT_BIT_PRECISION = 8;
const COLOR_COMPONENT_COUNT = 3;
const MIN_PREVIEW_LONG_SIDE = 64;
const MARKER_SIZE = 2;
const MARKER_CODE_OFFSET = 1;
const FILL_BYTE_SIZE = 1;
const SEGMENT_LENGTH_SIZE = 2;
const START_OF_IMAGE_SIGNATURE_SIZE = 3;
const FRAME_HEADER_OFFSET = { precision: 4, height: 5, width: 7, componentCount: 9 };

interface JpegCandidate {
  start: number;
  end: number;
  pixelCount: number;
}

interface FrameDimensions {
  width: number;
  height: number;
}

const readUint16 = (bytes: Uint8Array, offset: number): number => (bytes[offset] << 8) | bytes[offset + 1];

const isStartOfImageAt = (bytes: Uint8Array, position: number): boolean =>
  bytes[position] === MARKER_PREFIX &&
  bytes[position + MARKER_CODE_OFFSET] === START_OF_IMAGE &&
  bytes[position + MARKER_SIZE] === MARKER_PREFIX;

const findEndOfImage = (bytes: Uint8Array, scanStart: number): number | null => {
  for (let position = scanStart; position + MARKER_SIZE <= bytes.length; position++) {
    if (bytes[position] !== MARKER_PREFIX) continue;
    if (bytes[position + MARKER_CODE_OFFSET] === END_OF_IMAGE) return position + MARKER_SIZE;
    if (bytes[position + MARKER_CODE_OFFSET] === START_OF_IMAGE) return null;
  }
  return null;
};

/**
 * Reads the dimensions of the frame header starting at `position`. Returns null when the
 * frame is not 8-bit / 3-component or is too small to serve as a preview.
 */
const readFrameHeader = (bytes: Uint8Array, position: number): FrameDimensions | null => {
  const isEightBitColor =
    bytes[position + FRAME_HEADER_OFFSET.precision] === EIGHT_BIT_PRECISION &&
    bytes[position + FRAME_HEADER_OFFSET.componentCount] === COLOR_COMPONENT_COUNT;
  if (!isEightBitColor) return null;

  const height = readUint16(bytes, position + FRAME_HEADER_OFFSET.height);
  const width = readUint16(bytes, position + FRAME_HEADER_OFFSET.width);
  if (Math.max(width, height) < MIN_PREVIEW_LONG_SIDE) return null;

  return { width, height };
};

/**
 * Walks the JPEG segments starting at `start`. Returns null when the stream is malformed
 * or is not an 8-bit colour JPEG browsers can decode (lossless or 12-bit sensor tiles).
 */
const parseJpegAt = (bytes: Uint8Array, start: number): JpegCandidate | null => {
  let position = start + MARKER_SIZE;
  let pixelCount = 0;

  while (position + MARKER_SIZE + SEGMENT_LENGTH_SIZE <= bytes.length) {
    if (bytes[position] !== MARKER_PREFIX) return null;
    const marker = bytes[position + MARKER_CODE_OFFSET];

    if (marker === MARKER_PREFIX || STANDALONE_MARKERS.has(marker)) {
      position += marker === MARKER_PREFIX ? FILL_BYTE_SIZE : MARKER_SIZE;
      continue;
    }
    if (marker === START_OF_IMAGE || marker === END_OF_IMAGE || OTHER_FRAME_MARKERS.has(marker)) return null;

    if (BROWSER_DECODABLE_FRAMES.has(marker)) {
      const frame = readFrameHeader(bytes, position);
      if (!frame) return null;
      pixelCount = frame.width * frame.height;
    }

    position += MARKER_SIZE + readUint16(bytes, position + MARKER_SIZE);

    if (marker === START_OF_SCAN) {
      const end = pixelCount > 0 ? findEndOfImage(bytes, position) : null;
      return end === null ? null : { start, end, pixelCount };
    }
  }

  return null;
};

/**
 * Returns the largest browser-decodable JPEG embedded in a binary file (camera RAW
 * files carry one as preview), or null when there is none.
 */
export const findLargestEmbeddedJpeg = (bytes: Uint8Array): Uint8Array<ArrayBuffer> | null => {
  let largest: JpegCandidate | null = null;
  let position = 0;

  while (position + START_OF_IMAGE_SIGNATURE_SIZE < bytes.length) {
    const candidate = isStartOfImageAt(bytes, position) ? parseJpegAt(bytes, position) : null;

    if (!candidate) {
      position += 1;
      continue;
    }

    if (!largest || candidate.pixelCount > largest.pixelCount) largest = candidate;
    position = candidate.end;
  }

  return largest ? bytes.slice(largest.start, largest.end) : null;
};
