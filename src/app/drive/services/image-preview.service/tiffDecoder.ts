import UTIF from 'utif2';

export interface RgbaImage {
  width: number;
  height: number;
  data: Uint8Array<ArrayBuffer>;
}

export const TIFF_TAG = {
  width: 't256',
  height: 't257',
  compression: 't259',
  photometric: 't262',
  orientation: 't274',
};
const PHOTOMETRIC = { colorFilterArray: 32803, linearRaw: 34892 };
const RAW_SENSOR_PHOTOMETRICS = new Set(Object.values(PHOTOMETRIC));
const COMPRESSION = {
  none: 1,
  ccittRle: 2,
  ccittGroup3: 3,
  ccittGroup4: 4,
  lzw: 5,
  oldJpeg: 6,
  jpeg: 7,
  deflate: 8,
  packBits: 32773,
  thunderScan: 32809,
  adobeDeflate: 32946,
};
const SUPPORTED_COMPRESSIONS = new Set(Object.values(COMPRESSION));
const RGBA_CHANNELS = 4;
const NO_DOWNSAMPLING = 1;
const TIFF_HEADER_SIZE = 8;
/** 'II' byte order mark. */
const LITTLE_ENDIAN_BYTE_ORDER = [0x49, 0x49];
/** 'MM' byte order mark. */
const BIG_ENDIAN_BYTE_ORDER = [0x4d, 0x4d];
/** Pages above this would need several hundred MB of pixel buffers; they fall back to "no preview". */
const MAX_DECODABLE_PIXELS = 120_000_000;
/** Previews are downsampled to roughly 5000x4000 to keep canvas and memory usage bounded. */
export const MAX_PREVIEW_PIXELS = 20_000_000;

export const readTag = (ifd: UTIF.IFD, tag: string): number => Number((ifd[tag] as number[] | undefined)?.[0]);

const getPixelCount = (ifd: UTIF.IFD): number =>
  (readTag(ifd, TIFF_TAG.width) || 0) * (readTag(ifd, TIFF_TAG.height) || 0);

const isDisplayablePage = (ifd: UTIF.IFD): boolean => {
  const pixelCount = getPixelCount(ifd);
  const hasRawSensorData = RAW_SENSOR_PHOTOMETRICS.has(readTag(ifd, TIFF_TAG.photometric));
  const hasSupportedCompression = SUPPORTED_COMPRESSIONS.has(readTag(ifd, TIFF_TAG.compression) || COMPRESSION.none);

  return !hasRawSensorData && hasSupportedCompression && pixelCount > 0 && pixelCount <= MAX_DECODABLE_PIXELS;
};

const selectLargestDisplayablePage = (ifds: UTIF.IFD[]): UTIF.IFD | undefined =>
  ifds.filter(isDisplayablePage).sort((a, b) => getPixelCount(b) - getPixelCount(a))[0];

/** Averages the `factor` x `factor` source box whose top-left output pixel is (x, y), one value per RGBA channel. */
const averageBox = (data: Uint8Array, width: number, factor: number, x: number, y: number): number[] => {
  const sums: number[] = new Array(RGBA_CHANNELS).fill(0);
  const samplesPerBox = factor * factor;

  for (let boxY = 0; boxY < factor; boxY++) {
    let sourceIndex = ((y * factor + boxY) * width + x * factor) * RGBA_CHANNELS;
    for (let boxX = 0; boxX < factor; boxX++) {
      for (let channel = 0; channel < RGBA_CHANNELS; channel++) sums[channel] += data[sourceIndex + channel];
      sourceIndex += RGBA_CHANNELS;
    }
  }

  return sums.map((sum) => sum / samplesPerBox);
};

/** Shrinks the image by an integer factor (box average) so it holds at most `maxPixels`. */
const downsample = (image: RgbaImage, maxPixels: number): RgbaImage => {
  const { width, height, data } = image;
  const factor = Math.ceil(Math.sqrt((width * height) / maxPixels));
  if (factor <= NO_DOWNSAMPLING) return image;

  const outputWidth = Math.floor(width / factor);
  const outputHeight = Math.floor(height / factor);
  const output = new Uint8Array(outputWidth * outputHeight * RGBA_CHANNELS);

  for (let y = 0; y < outputHeight; y++) {
    for (let x = 0; x < outputWidth; x++) {
      output.set(averageBox(data, width, factor, x, y), (y * outputWidth + x) * RGBA_CHANNELS);
    }
  }

  return { width: outputWidth, height: outputHeight, data: output };
};

/** UTIF probes `window.UDOC` for CMYK pages; aliasing the global keeps Workers and Node on its built-in path. */
const ensureWindowGlobal = () => {
  const scope = globalThis as { window?: unknown };
  scope.window ??= globalThis;
};

const startsWith = (bytes: Uint8Array, prefix: number[]): boolean =>
  prefix.every((byte, index) => bytes[index] === byte);

export const hasTiffSignature = (bytes: Uint8Array): boolean =>
  bytes.length >= TIFF_HEADER_SIZE &&
  (startsWith(bytes, LITTLE_ENDIAN_BYTE_ORDER) || startsWith(bytes, BIG_ENDIAN_BYTE_ORDER));

/**
 * Decodes the largest displayable page of a TIFF into RGBA pixels (downsampled to
 * `maxPixels`), or returns null when the file holds nothing a browser can show.
 */
export const decodeTiffToRgba = (buffer: ArrayBuffer, maxPixels = MAX_PREVIEW_PIXELS): RgbaImage | null => {
  const page = selectLargestDisplayablePage(UTIF.decode(buffer));
  if (!page) return null;

  UTIF.decodeImage(buffer, page);
  if (!page.width || !page.height) return null;

  ensureWindowGlobal();
  const data = UTIF.toRGBA8(page) as Uint8Array<ArrayBuffer>;

  return downsample({ width: page.width, height: page.height, data }, maxPixels);
};
