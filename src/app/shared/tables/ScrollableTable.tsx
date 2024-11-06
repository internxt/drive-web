import React, { useEffect, useRef } from 'react';
import { Table, TableBody, TableCell, TableHeader, TableRow } from '@internxt/internxtui';
import { LoadingRowSkeleton } from './LoadingSkeleton';

interface HeaderProps {
  label: string;
  onClick?: (e: unknown) => void;
}

interface ActivityRow {
  id: string;
  date: string;
  time: string;
  member: {
    name: string;
    email: string;
  };
  activity: { action: string; color: string };
  access: string;
}

interface ScrollableTableProps {
  headers: HeaderProps[];
  data: ActivityRow[];
  scrollable?: boolean;
  loadMoreItems?: () => void;
  hasMoreItems?: boolean;
  loading?: boolean;
  className?: string;
}

export const ScrollableTable: React.FC<ScrollableTableProps> = ({
  headers,
  data,
  scrollable = false,
  loadMoreItems,
  hasMoreItems = false,
  loading = false,
  className = 'min-w-full border border-gray-10 rounded-lg overflow-hidden',
}) => {
  const observerRef = useRef<HTMLDivElement | null>(null);

  const numColumns = data.length > 0 ? headers.length : 4;
  console.log(numColumns);

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
    <div className={`${className} ${scrollable ? 'max-h-[80vh] overflow-y-auto' : ''}`}>
      <Table className="w-full border-separate">
        <TableHeader className="sticky top-0 z-10 border-b border-green bg-gray-1">
          <TableRow>
            {headers.map((header) => (
              <TableCell onClick={header.onClick} isHeader>
                {header.label}
              </TableCell>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody className="bg-none">
          {data.map((item) => (
            <TableRow key={item.id}>
              <TableCell>{item.date}</TableCell>
              <TableCell className="pl-10">
                <div>{item.member.name}</div>
                <div className="text-sm text-gray-50">{item.member.email}</div>
              </TableCell>
              <TableCell className="pl-10">
                <span className={`${item.activity.color} font-medium`}>{item.activity.action}</span>
              </TableCell>
              <TableCell className="pl-10">{item.access}</TableCell>
            </TableRow>
          ))}
          {!loading && <LoadingRowSkeleton numberOfColumns={numColumns} />}
        </TableBody>
      </Table>
      {/* Invisible div to observe and trigger load more */}
      {scrollable && hasMoreItems && <div ref={observerRef} className="h-2" />}
    </div>
  );
};
