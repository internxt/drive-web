import { beforeEach, describe, expect, test, vi } from 'vitest';
import { emptySearchFilters, searchItems, SearchFilters } from './search.service';
import { SdkFactory } from 'app/core/factory/sdk';

describe('searchItems', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockGlobalSearch = (response: unknown = { data: [] }) => {
    const getGlobalSearchItems = vi.fn().mockReturnValue([Promise.resolve(response), vi.fn()]);
    vi.spyOn(SdkFactory, 'getNewApiInstance').mockReturnValue({
      createNewStorageClient: vi.fn().mockReturnValue({ getGlobalSearchItems }),
    } as any);
    return getGlobalSearchItems;
  };

  const optionsSentToSdk = (getGlobalSearchItems: ReturnType<typeof vi.fn>) => getGlobalSearchItems.mock.calls[0][2];

  test('When no filters are active, then the SDK receives empty options', async () => {
    const getGlobalSearchItems = mockGlobalSearch();

    await searchItems('report', 'workspace-1', emptySearchFilters);

    expect(getGlobalSearchItems).toHaveBeenCalledWith('report', 'workspace-1', {});
  });

  test('When type categories are active, then they are included in the options', async () => {
    const getGlobalSearchItems = mockGlobalSearch();
    const filters: SearchFilters = { type: ['pdf', 'image'] };

    await searchItems('report', undefined, filters);

    expect(getGlobalSearchItems).toHaveBeenCalledWith('report', undefined, { type: ['pdf', 'image'] });
  });

  test('When size and date filters are set, then they are forwarded verbatim', async () => {
    const getGlobalSearchItems = mockGlobalSearch();
    const filters: SearchFilters = {
      type: [],
      minSize: 1024,
      maxSize: 5242880,
      modifiedAfter: '2026-01-01T00:00:00.000Z',
      modifiedBefore: '2026-06-30T23:59:59.999Z',
    };

    await searchItems('report', undefined, filters);

    expect(optionsSentToSdk(getGlobalSearchItems)).toEqual({
      minSize: 1024,
      maxSize: 5242880,
      modifiedAfter: '2026-01-01T00:00:00.000Z',
      modifiedBefore: '2026-06-30T23:59:59.999Z',
    });
  });

  test('When minSize is zero, then it is still included in the options', async () => {
    const getGlobalSearchItems = mockGlobalSearch();

    await searchItems('report', undefined, { type: [], minSize: 0 });

    expect(optionsSentToSdk(getGlobalSearchItems)).toEqual({ minSize: 0 });
  });

  test('When filters are combined, then all of them are present in the options', async () => {
    const getGlobalSearchItems = mockGlobalSearch();
    const filters: SearchFilters = { type: ['folder'], maxSize: 1000, modifiedAfter: '2026-05-01T00:00:00.000Z' };

    await searchItems('report', undefined, filters);

    expect(optionsSentToSdk(getGlobalSearchItems)).toEqual({
      type: ['folder'],
      maxSize: 1000,
      modifiedAfter: '2026-05-01T00:00:00.000Z',
    });
  });

  test('When filter fields are undefined, then the options have no keys for them', async () => {
    const getGlobalSearchItems = mockGlobalSearch();

    await searchItems('report', undefined, { type: ['audio'] });

    expect(Object.keys(optionsSentToSdk(getGlobalSearchItems))).toEqual(['type']);
  });

  test('When the response is wrapped in a data property, then the inner list is returned', async () => {
    const results = [{ id: '1' }, { id: '2' }];
    mockGlobalSearch({ data: results });

    expect(await searchItems('report', undefined, emptySearchFilters)).toEqual(results);
  });

  test('When the response is a plain array, then it is returned as is', async () => {
    const results = [{ id: '1' }];
    mockGlobalSearch(results);

    expect(await searchItems('report', undefined, emptySearchFilters)).toEqual(results);
  });
});
