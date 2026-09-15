import { describe, expect, test } from 'vitest';
import { getFavoriteToolbarAction } from './getFavoriteToolbarAction';
import { DriveItemData } from 'app/drive/types';

const buildItem = (isFavorite?: boolean): DriveItemData => ({ uuid: 'uuid', isFavorite }) as DriveItemData;

describe('getFavoriteToolbarAction', () => {
  test('When no items are selected, then it returns null', () => {
    expect(getFavoriteToolbarAction([])).toBeNull();
  });

  test('When a single non-favorited item is selected, then it returns "add"', () => {
    expect(getFavoriteToolbarAction([buildItem(false)])).toBe('add');
  });

  test('When a single favorited item is selected, then it returns "remove"', () => {
    expect(getFavoriteToolbarAction([buildItem(true)])).toBe('remove');
  });

  test('When no selected item is favorited, then it returns "add"', () => {
    expect(getFavoriteToolbarAction([buildItem(false), buildItem(false)])).toBe('add');
  });

  test('When every selected item is favorited, then it returns "remove"', () => {
    expect(getFavoriteToolbarAction([buildItem(true), buildItem(true)])).toBe('remove');
  });

  test('When the selection is mixed, then it returns null', () => {
    expect(getFavoriteToolbarAction([buildItem(true), buildItem(false)])).toBeNull();
  });

  test('When items have no isFavorite field, then they are treated as not favorited', () => {
    expect(getFavoriteToolbarAction([buildItem(undefined)])).toBe('add');
    expect(getFavoriteToolbarAction([buildItem(undefined), buildItem(true)])).toBeNull();
  });
});
