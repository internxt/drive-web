import { describe, expect, test } from 'vitest';
import { SearchFileCategory } from '@internxt/sdk/dist/drive/storage/types';
import { toggleTypeCategory } from './typeFilterUtils';

const ALL_CATEGORIES: SearchFileCategory[] = [
  'folder',
  'pdf',
  'image',
  'video',
  'audio',
  'zip',
  'word',
  'ppt',
  'xls',
  'txt',
  'code',
  'csv',
  'xml',
  'figma',
];

describe('toggleTypeCategory', () => {
  test('When no category is selected, then toggling one selects it alone', () => {
    expect(toggleTypeCategory([], 'pdf')).toEqual(['pdf']);
  });

  test('When a category is unselected, then toggling it adds it to the selection', () => {
    expect(toggleTypeCategory(['pdf'], 'image')).toEqual(['pdf', 'image']);
  });

  test('When a category is selected, then toggling it removes it from the selection', () => {
    expect(toggleTypeCategory(['pdf', 'image'], 'pdf')).toEqual(['image']);
  });

  test('When the last selected category is toggled, then the selection returns to any type', () => {
    expect(toggleTypeCategory(['pdf'], 'pdf')).toEqual([]);
  });

  test('When every category ends up selected, then the selection normalizes to any type', () => {
    const allButOne = ALL_CATEGORIES.filter((category) => category !== 'figma');

    expect(toggleTypeCategory(allButOne, 'figma')).toEqual([]);
  });

  test('When toggling, then the original selection is not mutated', () => {
    const selected: SearchFileCategory[] = ['pdf', 'image'];

    toggleTypeCategory(selected, 'video');

    expect(selected).toEqual(['pdf', 'image']);
  });
});
