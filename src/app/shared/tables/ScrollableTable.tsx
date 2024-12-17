import React, { ReactNode, useCallback, useRef } from 'react';
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
  renderBody: (setLastItemRef: SetLastItemRef) => ReactNode;
}

export type SetLastItemRef = (node: HTMLElement | null) => void;

export const ScrollableTable: React.FC<ScrollableTableProps> = ({
  numOfColumnsForSkeleton,
  scrollable = false,
  hasMoreItems = false,
  isLoading = false,
  containerClassName = 'min-w-full relative border border-gray-10 h-full rounded-lg overflow-hidden',
  tableClassName,
  tableHeaderClassName,
  tableBodyClassName,
  renderHeader,
  renderBody,
  loadMoreItems,
}) => {
  const observerRef = useRef<IntersectionObserver | null>(null);

  const setLastItemRef = useCallback<SetLastItemRef>(
    (node) => {
      if (isLoading || !hasMoreItems) return;

      // Define el observerRef con un tipo específico

      // Desconecta el observer anterior si existe
      if (observerRef.current) observerRef.current.disconnect();

      // Crea un nuevo IntersectionObserver
      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting) {
            loadMoreItems?.(); // Llama a loadMoreItems si el último ítem es visible
          }
        },
        { root: null, threshold: 0.5 }, // Configuración del observer
      );

      // Observa el nodo si existe
      if (node) observerRef.current.observe(node);
    },
    [isLoading, hasMoreItems, loadMoreItems],
  );
  return (
    <div className={`${containerClassName} ${scrollable ? 'max-h-[80vh] overflow-y-auto' : ''}`}>
      <Table className={tableClassName}>
        <TableHeader className={tableHeaderClassName}>{renderHeader()}</TableHeader>
        <TableBody className={tableBodyClassName}>
          {renderBody(setLastItemRef)}
          {isLoading && <LoadingRowSkeleton numberOfColumns={numOfColumnsForSkeleton} />}
        </TableBody>
      </Table>
      {/* Invisible div to observe and trigger load more */}
      {/* {scrollable && hasMoreItems && <div ref={observerRef} className="h-2" />} */}
    </div>
  );
};
