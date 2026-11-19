import { describe, expect, test } from 'vitest';
import { getDriveThumbnail, getThumbnailDto } from 'testUtils/fixtures/drive.fixtures';
import { toDriveThumbnail } from './driveThumbnail.utils';

describe('Drive thumbnail mapping', () => {
  test('When a thumbnail comes in camelCase, then it is mapped to the snake_case drive thumbnail', () => {
    expect(toDriveThumbnail(getThumbnailDto())).toEqual(getDriveThumbnail());
  });

  test('When a thumbnail already comes in snake_case, then it is kept as is', () => {
    const driveThumbnail = getDriveThumbnail();

    expect(toDriveThumbnail(driveThumbnail)).toBe(driveThumbnail);
  });
});
