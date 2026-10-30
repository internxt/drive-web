import { describe, expect, test, vi } from 'vitest';
import { getDriveListOrder, getListHeaders } from './getListHeaders';
import { OrderDirection } from 'app/core/types';

describe('List column headers', () => {
  const mockTranslate = vi.fn((key: string) => key);

  const getModifiedHeader = (canSortByModified: boolean) =>
    getListHeaders(mockTranslate, false, false, canSortByModified).find((header) => header.name === 'updatedAt');

  test('when viewing the regular drive, then it returns name, modified date, and size columns', () => {
    const headers = getListHeaders(mockTranslate, false, false);

    expect(headers).toHaveLength(3);
    expect(headers[0].name).toBe('name');
    expect(headers[1].name).toBe('updatedAt');
    expect(headers[2].name).toBe('size');
  });

  test('when viewing the trash, then it includes a sortable auto-delete column and disables size sorting', () => {
    const headers = getListHeaders(mockTranslate, false, true);

    expect(headers).toHaveLength(4);

    const caducityHeader = headers.find((h) => h.name === 'expiresAt');
    expect(caducityHeader?.label).toBe('drive.list.columns.autoDelete');
    expect(caducityHeader?.orderable).toBe(true);

    const sizeHeader = headers.find((h) => h.name === 'size');
    expect(sizeHeader?.orderable).toBe(false);
  });

  test('when viewing recent files, then all columns cannot be sorted', () => {
    const headers = getListHeaders(mockTranslate, true, false);

    headers.forEach((header) => {
      expect(header.orderable).toBe(false);
    });
  });

  test('when viewing the personal drive, then the Modified column cannot be sorted', () => {
    expect(getModifiedHeader(false)?.orderable).toBe(false);
  });

  test('when viewing a workspace drive or favorites, then the Modified column can still be sorted', () => {
    expect(getModifiedHeader(true)?.orderable).toBe(true);
  });
});

describe('Drive list sort indicator', () => {
  const modifiedOrder = { by: 'updatedAt', direction: OrderDirection.Asc };

  test('when the personal drive is shown after sorting another view by Modified, then the header shows the name order in use', () => {
    expect(getDriveListOrder(modifiedOrder, 'DESC', true)).toEqual({ by: 'name', direction: OrderDirection.Desc });
  });

  test('when another view is shown, then its own sort order is kept', () => {
    expect(getDriveListOrder(modifiedOrder, 'DESC', false)).toEqual(modifiedOrder);
  });
});
