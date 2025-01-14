import React, { ReactNode, useEffect, useRef } from 'react';

interface ScrollableTableProps {
  scrollable?: boolean;
  hasMoreItems?: boolean;
  isLoading?: boolean;
  containerClassName?: string;
  children: ReactNode;
  loadMoreItems?: () => void;
}

export const ScrollableTable: React.FC<ScrollableTableProps> = ({
  scrollable = false,
  hasMoreItems = false,
  isLoading,
  containerClassName = 'min-w-full relative border border-gray-10 h-full rounded-lg overflow-hidden',
  children,
  loadMoreItems,
}) => {
  const observerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!scrollable || isLoading || !hasMoreItems || !loadMoreItems) return;

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
    <div className={`${containerClassName} ${scrollable ? 'max-h-[70vh] overflow-y-auto' : ''}`}>
      {children}
      {/* Invisible div to observe and trigger load more */}
      {scrollable && hasMoreItems && <div ref={observerRef} className="h-2" />}
    </div>
  );
};
