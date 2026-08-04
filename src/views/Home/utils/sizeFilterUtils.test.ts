import { describe, expect, test } from 'vitest';
import {
  changeCustomSize,
  CustomSizeRange,
  emptyCustomSizeRange,
  isSizeFilterActive,
  sizePresetToRange,
} from './sizeFilterUtils';

describe('sizePresetToRange', () => {
  test('When the preset is any, then no bounds are returned', () => {
    expect(sizePresetToRange('any', emptyCustomSizeRange)).toEqual({ minSize: undefined, maxSize: undefined });
  });

  test('When a less-than preset is selected, then only the upper bound is returned in bytes', () => {
    expect(sizePresetToRange('less5mb', emptyCustomSizeRange)).toEqual({ minSize: undefined, maxSize: 5242880 });
    expect(sizePresetToRange('less100mb', emptyCustomSizeRange)).toEqual({ minSize: undefined, maxSize: 104857600 });
    expect(sizePresetToRange('less1gb', emptyCustomSizeRange)).toEqual({ minSize: undefined, maxSize: 1073741824 });
  });

  test('When the more-than preset is selected, then only the lower bound is returned in bytes', () => {
    expect(sizePresetToRange('more1gb', emptyCustomSizeRange)).toEqual({ minSize: 1073741824, maxSize: undefined });
  });

  test('When the preset is custom, then each bound is converted with its own unit', () => {
    const custom: CustomSizeRange = { biggerThan: 10, biggerThanUnit: 'KB', smallerThan: 5, smallerThanUnit: 'GB' };

    expect(sizePresetToRange('custom', custom)).toEqual({ minSize: 10240, maxSize: 5368709120 });
  });

  test('When a custom bound is missing, then an open range is returned', () => {
    const custom: CustomSizeRange = { ...emptyCustomSizeRange, smallerThan: 2, smallerThanUnit: 'MB' };

    expect(sizePresetToRange('custom', custom)).toEqual({ minSize: undefined, maxSize: 2097152 });
  });
});

describe('changeCustomSize', () => {
  test('When the change keeps the range valid, then it is applied', () => {
    const current: CustomSizeRange = { ...emptyCustomSizeRange, biggerThan: 10 };

    expect(changeCustomSize(current, { smallerThan: 5 }).smallerThan).toBe(5);
  });

  test('When a unit changes with a value set, then the value is preserved', () => {
    const current: CustomSizeRange = { ...emptyCustomSizeRange, biggerThan: 10 };

    const next = changeCustomSize(current, { biggerThanUnit: 'MB' });

    expect(next).toEqual({ ...current, biggerThanUnit: 'MB' });
  });

  test('When the change would invert the range in bytes, then the current range is returned unchanged', () => {
    const current: CustomSizeRange = { biggerThan: 10, biggerThanUnit: 'KB', smallerThan: 5, smallerThanUnit: 'GB' };

    expect(changeCustomSize(current, { smallerThanUnit: 'B' })).toBe(current);
  });

  test('When both bounds are equal in bytes, then the change is accepted', () => {
    const current: CustomSizeRange = { biggerThan: 1024, biggerThanUnit: 'B', smallerThanUnit: 'KB' };

    expect(changeCustomSize(current, { smallerThan: 1 }).smallerThan).toBe(1);
  });

  test('When a bound is cleared, then the range is always accepted', () => {
    const current: CustomSizeRange = { biggerThan: 10, biggerThanUnit: 'KB', smallerThan: 5, smallerThanUnit: 'GB' };

    expect(changeCustomSize(current, { biggerThan: undefined }).biggerThan).toBeUndefined();
  });
});

describe('isSizeFilterActive', () => {
  test('When the preset is any, then the filter is not active', () => {
    expect(isSizeFilterActive('any', emptyCustomSizeRange)).toBe(false);
  });

  test('When a bounded preset is selected, then the filter is active', () => {
    expect(isSizeFilterActive('less5mb', emptyCustomSizeRange)).toBe(true);
    expect(isSizeFilterActive('more1gb', emptyCustomSizeRange)).toBe(true);
  });

  test('When the custom preset is selected with no bounds, then the filter is not active', () => {
    expect(isSizeFilterActive('custom', emptyCustomSizeRange)).toBe(false);
  });

  test('When the custom preset is selected with one bound, then the filter is active', () => {
    const custom: CustomSizeRange = { biggerThan: 10, biggerThanUnit: 'KB', smallerThanUnit: 'GB' };

    expect(isSizeFilterActive('custom', custom)).toBe(true);
  });
});
