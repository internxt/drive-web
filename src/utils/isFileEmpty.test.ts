import { describe, expect, test } from 'vitest';
import { DriveFileData } from 'app/drive/types';
import { isFileEmpty } from './isFileEmpty';

describe('Is file empty check', () => {
  test('When the file size is 0, then it should indicate so', () => {
    const emptyFile = { size: 0 } as DriveFileData;

    expect(isFileEmpty(emptyFile)).toBe(true);
  });

  test('When the file size is not 0, then it should indicate so', () => {
    const nonEmptyFile = new File(['content'], 'file.txt');

    expect(isFileEmpty(nonEmptyFile)).toBe(false);
  });
});
