import { describe, expect, test } from 'vitest';
import { SearchFileCategory } from '../services';
import {
  ALL_TYPE_CATEGORIES,
  areAllTypeCategoriesSelected,
  isTypeFilterActive,
  toggleAllTypeCategories,
  toggleTypeCategory,
} from './typeFilterUtils';

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

  test('When the last selected category is toggled, then the selection is left empty', () => {
    expect(toggleTypeCategory(['pdf'], 'pdf')).toEqual([]);
  });

  test('When every category ends up selected, then the selection keeps all of them', () => {
    const allButOne = ALL_TYPE_CATEGORIES.filter((category) => category !== 'figma');

    expect(toggleTypeCategory(allButOne, 'figma')).toHaveLength(ALL_TYPE_CATEGORIES.length);
  });

  test('When toggling, then the original selection is not mutated', () => {
    const selected: SearchFileCategory[] = ['pdf', 'image'];

    toggleTypeCategory(selected, 'video');

    expect(selected).toEqual(['pdf', 'image']);
  });
});

describe('toggleAllTypeCategories', () => {
  test('When every category is selected, then toggling all deselects them', () => {
    expect(toggleAllTypeCategories(ALL_TYPE_CATEGORIES)).toEqual([]);
  });

  test('When no category is selected, then toggling all selects them', () => {
    expect(toggleAllTypeCategories([])).toEqual(ALL_TYPE_CATEGORIES);
  });

  test('When only some categories are selected, then toggling all selects them', () => {
    expect(toggleAllTypeCategories(['pdf', 'image'])).toEqual(ALL_TYPE_CATEGORIES);
  });

  test('When toggling all, then the shared category list is not returned by reference', () => {
    expect(toggleAllTypeCategories([])).not.toBe(ALL_TYPE_CATEGORIES);
  });
});

describe('isTypeFilterActive', () => {
  test('When no category is selected, then the filter is not active', () => {
    expect(isTypeFilterActive([])).toBe(false);
  });

  test('When every category is selected, then the filter is not active', () => {
    expect(isTypeFilterActive(ALL_TYPE_CATEGORIES)).toBe(false);
  });

  test('When only some categories are selected, then the filter is active', () => {
    expect(isTypeFilterActive(['pdf'])).toBe(true);
  });
});

describe('areAllTypeCategoriesSelected', () => {
  test('When every category is selected, then it returns true', () => {
    expect(areAllTypeCategoriesSelected(ALL_TYPE_CATEGORIES)).toBe(true);
  });

  test('When one category is missing, then it returns false', () => {
    expect(areAllTypeCategoriesSelected(ALL_TYPE_CATEGORIES.slice(1))).toBe(false);
  });
});
