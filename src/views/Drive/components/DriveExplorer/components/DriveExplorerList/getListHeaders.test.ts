import { describe, expect, test, vi } from 'vitest';
import { getListHeaders } from './getListHeaders';

describe('List column headers', () => {
  const mockTranslate = vi.fn((key: string) => key);

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

    const caducityHeader = headers.find((h) => h.name === 'caducityDate');
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
});
