import { asciiBytes, buildBmffBox, buildJpeg, buildTiff, concatBytes } from 'testUtils/imageBuilders';
import { describe, expect, test } from 'vitest';
import { applyExifOrientation, readContainerOrientation } from './jpegOrientation';

const ROTATED_90_CW = 6;
const ROTATED_90_CCW = 8;
const SOI_SIZE = 2;
const EXIF_HEADER = asciiBytes('Exif\0\0');
const LITTLE_ENDIAN_TIFF_HEADER = [0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00];
const preview = buildJpeg({ width: 640, height: 480 });
const exifApp1 = Uint8Array.from([0xff, 0xe1, 0x00, 0x08, ...EXIF_HEADER]);
const jpegWithExif = concatBytes(preview.subarray(0, SOI_SIZE), exifApp1, preview.subarray(SOI_SIZE));
const fileTypeBox = buildBmffBox('ftyp', new Uint8Array(16));

const singleEntryTiff = (entry: number[]): number[] => [...LITTLE_ENDIAN_TIFF_HEADER, 1, 0, ...entry, 0, 0, 0, 0];

const corruptedTiff = Uint8Array.from(
  singleEntryTiff([0x12, 0x01, 0x01, 0x00, 0x08, 0x00, 0x00, 0x00, 0xff, 0xff, 0x00, 0x00]),
);

const orientationSegment = (orientation: number): number[] => [
  ...[0xff, 0xe1, 0x00, 0x22],
  ...EXIF_HEADER,
  ...singleEntryTiff([0x12, 0x01, 0x03, 0x00, 0x01, 0x00, 0x00, 0x00, orientation, 0x00, 0x00, 0x00]),
];

const tiffWithOrientation = (orientation: number) => new Uint8Array(buildTiff([{ width: 8, height: 8, orientation }]));
const rawFile = (...chunks: Uint8Array[]): ArrayBuffer => concatBytes(...chunks).buffer;

describe('applyExifOrientation', () => {
  test.each([
    [2, 'a bare preview', preview],
    [ROTATED_90_CW, 'a bare preview', preview],
    [ROTATED_90_CCW, 'a bare preview', preview],
    [ROTATED_90_CW, 'a preview that already has EXIF', jpegWithExif],
  ])(
    'when the container says orientation %i and the preview is %s, then that orientation is inserted after SOI',
    (orientation, _, source) => {
      const rotated = applyExifOrientation(source, orientation);
      const segment = orientationSegment(orientation);
      const segmentEnd = SOI_SIZE + segment.length;

      expect(Array.from(rotated.subarray(0, segmentEnd))).toEqual([0xff, 0xd8, ...segment]);
      expect(rotated.subarray(segmentEnd)).toEqual(source.subarray(SOI_SIZE));
    },
  );

  test.each([1, undefined, 9])('when the orientation is %s, then the preview bytes stay unchanged', (orientation) => {
    expect(applyExifOrientation(preview, orientation)).toBe(preview);
  });
});

describe('readContainerOrientation', () => {
  test('when the RAW is TIFF-based, then the orientation of its first page is read', () => {
    expect(readContainerOrientation(rawFile(tiffWithOrientation(ROTATED_90_CW), preview))).toBe(ROTATED_90_CW);
  });

  test('when the file is a Canon CR3, then the orientation is read from its metadata box alone, whatever follows it', () => {
    const metadataBox = buildBmffBox('CMT1', tiffWithOrientation(ROTATED_90_CCW));
    const cr3File = rawFile(fileTypeBox, metadataBox, new Uint8Array(4096).fill(0xff));

    expect(readContainerOrientation(cr3File)).toBe(ROTATED_90_CCW);
  });

  test.each([
    ['a TIFF-based RAW without an orientation tag', buildTiff([{ width: 8, height: 8 }])],
    ['a RAW whose container metadata is corrupted', rawFile(corruptedTiff, preview)],
    ['a Canon CR3 without a metadata box', rawFile(fileTypeBox, preview)],
    ['neither TIFF-based nor a CR3', preview.buffer],
  ])('when the file is %s, then no orientation is read', (_, file) => {
    expect(readContainerOrientation(file)).toBeUndefined();
  });
});
