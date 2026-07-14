import { describe, expect, it } from 'vitest';
import { getFavoriteToolbarAction } from './getFavoriteToolbarAction';
import { DriveItemData } from 'app/drive/types';

const buildItem = (isFavorite?: boolean): DriveItemData => ({ uuid: 'uuid', isFavorite }) as DriveItemData;

describe('getFavoriteToolbarAction', () => {
  it('should return null when no items are selected', () => {
    expect(getFavoriteToolbarAction([])).toBeNull();
  });

  it('should return "add" for a single non-favorited item', () => {
    expect(getFavoriteToolbarAction([buildItem(false)])).toBe('add');
  });

  it('should return "remove" for a single favorited item', () => {
    expect(getFavoriteToolbarAction([buildItem(true)])).toBe('remove');
  });

  it('should return "add" when no selected item is favorited', () => {
    expect(getFavoriteToolbarAction([buildItem(false), buildItem(false)])).toBe('add');
  });

  it('should return "remove" when every selected item is favorited', () => {
    expect(getFavoriteToolbarAction([buildItem(true), buildItem(true)])).toBe('remove');
  });

  it('should return null for a mixed selection', () => {
    expect(getFavoriteToolbarAction([buildItem(true), buildItem(false)])).toBeNull();
  });

  it('should treat items without the isFavorite field as not favorited', () => {
    expect(getFavoriteToolbarAction([buildItem(undefined)])).toBe('add');
    expect(getFavoriteToolbarAction([buildItem(undefined), buildItem(true)])).toBeNull();
  });
});
