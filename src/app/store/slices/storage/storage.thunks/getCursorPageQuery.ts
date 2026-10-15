import { FolderFoldersCursorQuery } from '@internxt/sdk/dist/drive/storage/types';

export const DEFAULT_LIMIT = 50;

export const getCursorPageQuery = (order: string, cursor?: string | null): FolderFoldersCursorQuery => ({
  order: order as FolderFoldersCursorQuery['order'],
  limit: DEFAULT_LIMIT,
  cursor: cursor ?? undefined,
  withSharings: true,
  withFavorites: true,
});

interface HasMorePagesParams {
  isCursorPagination: boolean;
  nextCursor?: string | null;
  itemsLength: number;
}

export const hasMorePages = ({ isCursorPagination, nextCursor, itemsLength }: HasMorePagesParams): boolean => {
  const hasNextCursor = nextCursor !== null;
  const isFullPage = itemsLength >= DEFAULT_LIMIT;
  return isCursorPagination ? hasNextCursor : isFullPage;
};
