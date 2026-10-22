import { describe, expect, test, vi } from 'vitest';
import { getListHeaders } from './getListHeaders';

describe('List column headers', () => {
  const mockTranslate = vi.fn((key: string) => key);

  test('when viewing the regular drive, then it returns name, modified date, size and link expiration columns', () => {
    const headers = getListHeaders(mockTranslate, false, false);

    expect(headers).toHaveLength(4);
    expect(headers[0].name).toBe('name');
    expect(headers[1].name).toBe('updatedAt');
    expect(headers[2].name).toBe('size');
    expect(headers[3].name).toBe('linkExpirationDate');
  });

  test('when viewing the trash, then it includes a sortable auto-delete column and disables size sorting', () => {
    const headers = getListHeaders(mockTranslate, false, true);

    expect(headers).toHaveLength(5);

    const caducityHeader = headers.find((h) => h.name === 'expiresAt');
    expect(caducityHeader?.label).toBe('drive.list.columns.autoDelete');
    expect(caducityHeader?.orderable).toBe(true);

    const sizeHeader = headers.find((h) => h.name === 'size');
    expect(sizeHeader?.orderable).toBe(false);
  });

  test.each([
    { view: 'drive', isRecents: false, isTrash: false },
    { view: 'recents', isRecents: true, isTrash: false },
    { view: 'trash', isRecents: false, isTrash: true },
  ])('when viewing $view, then the last column is the non sortable link expiration', ({ isRecents, isTrash }) => {
    const headers = getListHeaders(mockTranslate, isRecents, isTrash);

    const expirationHeader = headers[headers.length - 1];
    expect(expirationHeader?.name).toBe('linkExpirationDate');
    expect(expirationHeader?.label).toBe('drive.list.columns.expiration');
    expect(expirationHeader?.orderable).toBe(false);
  });

  test('when viewing recent files, then all columns cannot be sorted', () => {
    const headers = getListHeaders(mockTranslate, true, false);

    headers.forEach((header) => {
      expect(header.orderable).toBe(false);
    });
  });
});
