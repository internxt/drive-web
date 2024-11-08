import React, { ReactNode, useEffect, useRef } from 'react';
import { Table, TableBody, TableHeader } from '@internxt/internxtui';
import { LoadingRowSkeleton } from './LoadingSkeleton';

interface ScrollableTableProps {
  numOfColumnsForSkeleton: number;
  scrollable?: boolean;
  hasMoreItems?: boolean;
  isLoading?: boolean;
  containerClassName?: string;
  tableClassName?: string;
  tableHeaderClassName?: string;
  tableBodyClassName?: string;
  loadMoreItems?: () => void;
  renderHeader: () => ReactNode;
  renderBody: () => ReactNode;
}

export const ScrollableTable: React.FC<ScrollableTableProps> = ({
  numOfColumnsForSkeleton,
  scrollable = false,
  hasMoreItems = false,
  isLoading = false,
  containerClassName = 'min-w-full border border-gray-10 h-full rounded-lg overflow-hidden',
  tableClassName,
  tableHeaderClassName,
  tableBodyClassName,
  renderHeader,
  renderBody,
  loadMoreItems,
}) => {
  const observerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!scrollable || !hasMoreItems || !loadMoreItems) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMoreItems();
        }
      },
      { threshold: 1 },
    );

    if (observerRef.current) observer.observe(observerRef.current);

    return () => observer.disconnect();
  }, [scrollable, hasMoreItems, loadMoreItems]);

  return (
    <div className={`${containerClassName} ${scrollable ? 'max-h-[80vh] overflow-y-auto' : ''}`}>
      <Table className={tableClassName}>
        <TableHeader className={tableHeaderClassName}>{renderHeader()}</TableHeader>
        <TableBody className={tableBodyClassName}>
          {renderBody()}
          {isLoading && <LoadingRowSkeleton numberOfColumns={numOfColumnsForSkeleton} />}
        </TableBody>
      </Table>
      {/* Invisible div to observe and trigger load more */}
      {scrollable && hasMoreItems && <div ref={observerRef} className="h-2" />}
    </div>
  );
};
