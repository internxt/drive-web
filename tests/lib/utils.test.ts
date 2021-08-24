import { config } from 'dotenv';
import { getFilenameAndExt, isHiddenItem } from '../../src/lib/utils';
import { DriveItemData } from '../../src/models/interfaces';
import { driveItemFake } from '../fakes';
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

describe('isHiddenItem tests', () => {
  const fakeBase: DriveItemData = driveItemFake;

  it('should return false for a non hidden item', () => {
    const nonHidden = { ...fakeBase, name: 'test' };

    expect(isHiddenItem(nonHidden)).toBe(false);
  });

  it('should return false for a non hidden item with dots in its name', () => {
    const nonHidden = { ...fakeBase, name: 'test.yes' };

    expect(isHiddenItem(nonHidden)).toBe(false);
  });

  it('should return false true for a hidden item', () => {
    const hidden = { ...fakeBase, name: '.test' };

    expect(isHiddenItem(hidden)).toBe(true);
  });

  it('should return false true for a hidden item with other dots in its name', () => {
    const hidden = { ...fakeBase, name: '.test.yes' };

    expect(isHiddenItem(hidden)).toBe(true);
  });
});
