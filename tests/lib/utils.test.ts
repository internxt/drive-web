import { config } from 'dotenv';
import { getFilenameAndExt } from '../../src/lib/utils';
config();

describe('getFilenameAndExt tests', () => {
  it('Should parse the most common filenames', () => {
    const { filename, extension } = getFilenameAndExt('test.txt');

    expect(filename).toBe('test');
    expect(extension).toBe('txt');
  });

  it('Should parse no extension files', () => {
    const { filename, extension } = getFilenameAndExt('test');

    expect(filename).toBe('test');
    expect(extension).toBeUndefined();
  });

  it('Should parse "hidden" files', () => {
    const { filename, extension } = getFilenameAndExt('.test');

    expect(filename).toBe('.test');
    expect(extension).toBeUndefined();
  });

  it('Should parse files with more than one dot', () => {
    const { filename, extension } = getFilenameAndExt('this.test.txt');

    expect(filename).toBe('this.test');
    expect(extension).toBe('txt');
  });
});
