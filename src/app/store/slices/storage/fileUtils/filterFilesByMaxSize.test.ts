import { describe, expect, test } from 'vitest';
import { filterFilesByMaxSize } from './filterFilesByMaxSize';

const createFile = (name: string, size: number): File => new File([new ArrayBuffer(size)], name);

describe('Filtering files by size limit', () => {
  describe('When no max size limit is provided', () => {
    test('When there is no max size limit, then all files are allowed regardless of their size', () => {
      const files = [createFile('big.mp4', 999_999_999), createFile('small.txt', 1)];

      const { allowedFilesToUpload, exceededFiles } = filterFilesByMaxSize({ files });

      expect(allowedFilesToUpload).toEqual(files);
      expect(exceededFiles).toHaveLength(0);
    });
  });

  describe('When a max size limit is provided', () => {
    const maxUploadFileSize = 100;

    test('When all files are within the limit, then all files are allowed and none are exceeded', () => {
      const files = [createFile('a.txt', 50), createFile('b.txt', 100)];

      const { allowedFilesToUpload, exceededFiles } = filterFilesByMaxSize({ files, maxUploadFileSize });

      expect(allowedFilesToUpload).toEqual(files);
      expect(exceededFiles).toHaveLength(0);
    });

    test('When all files exceed the limit, then no files are allowed and all are exceeded', () => {
      const files = [createFile('a.mp4', 101), createFile('b.mp4', 200)];

      const { allowedFilesToUpload, exceededFiles } = filterFilesByMaxSize({ files, maxUploadFileSize });

      expect(allowedFilesToUpload).toHaveLength(0);
      expect(exceededFiles).toEqual(files);
    });

    test('When some files exceed the limit, then only the files within the limit are allowed', () => {
      const smallFile = createFile('small.txt', 50);
      const bigFile = createFile('big.mp4', 200);

      const { allowedFilesToUpload, exceededFiles } = filterFilesByMaxSize({
        files: [smallFile, bigFile],
        maxUploadFileSize,
      });

      expect(allowedFilesToUpload).toEqual([smallFile]);
      expect(exceededFiles).toEqual([bigFile]);
    });

    test('When a file size is exactly the limit, then it is allowed and not exceeded', () => {
      const file = createFile('exact.zip', 100);

      const { allowedFilesToUpload, exceededFiles } = filterFilesByMaxSize({
        files: [file],
        maxUploadFileSize,
      });

      expect(allowedFilesToUpload).toEqual([file]);
      expect(exceededFiles).toHaveLength(0);
    });

    test('When the file list is empty, then both lists are empty', () => {
      const { allowedFilesToUpload, exceededFiles } = filterFilesByMaxSize({ files: [], maxUploadFileSize });

      expect(allowedFilesToUpload).toHaveLength(0);
      expect(exceededFiles).toHaveLength(0);
    });
  });
});
