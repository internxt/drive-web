import { describe, expect, test } from 'vitest';
import { getContextMenuPosition } from './contextMenuPosition';

const menuSize = { width: 200, height: 150 };
const viewport = { width: 1000, height: 800 };

describe('Context menu position', () => {
  test('When there is room around the click, then the menu opens at the click point', () => {
    expect(getContextMenuPosition({ x: 300, y: 200 }, menuSize, viewport)).toStrictEqual({ x: 300, y: 200 });
  });

  test('When the click is close to the right edge, then the menu opens to the left of the click', () => {
    expect(getContextMenuPosition({ x: 900, y: 200 }, menuSize, viewport)).toStrictEqual({ x: 700, y: 200 });
  });

  test('When the click is close to the bottom edge, then the menu opens above the click', () => {
    expect(getContextMenuPosition({ x: 300, y: 700 }, menuSize, viewport)).toStrictEqual({ x: 300, y: 550 });
  });

  test('When the click is in the bottom right corner, then the menu opens above and to the left of the click', () => {
    expect(getContextMenuPosition({ x: 900, y: 700 }, menuSize, viewport)).toStrictEqual({ x: 700, y: 550 });
  });

  test('When the menu fits exactly up to the edge, then it still opens at the click point', () => {
    expect(getContextMenuPosition({ x: 800, y: 650 }, menuSize, viewport)).toStrictEqual({ x: 800, y: 650 });
  });
});
