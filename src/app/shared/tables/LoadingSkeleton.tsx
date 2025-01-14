import { TableCell, TableRow } from '@internxt/ui';

export const LoadingRowSkeleton = ({ numberOfColumns }: { numberOfColumns: number }) => {
  const totalRowsArray = new Array(5).fill(null);
  return (
    <>
      {totalRowsArray.map((_, rowIndex) => (
        <>
          {new Array(numberOfColumns).fill(null).map((_, index) => (
            <TableRow
              key={`skeleton-key-${index}`}
              className="border-b border-gray-10 text-sm last:border-none hover:bg-gray-5"
            >
              <TableCell
                style={{
                  width: '30%',
                }}
                className="py-2 px-4"
              >
                <div className="flex flex-col w-full gap-1">
                  <div className="h-4 w-full animate-pulse rounded bg-gray-80 dark:bg-gray-20" />
                </div>
              </TableCell>
              <TableCell
                style={{
                  width: '30%',
                }}
                className="py-2 px-4"
              >
                <div className="flex w-screen max-w-[135px] flex-col gap-1 truncate">
                  <div className="h-4 animate-pulse rounded bg-gray-80 dark:bg-gray-20" />
                </div>
              </TableCell>
              <TableCell
                style={{
                  width: '20%',
                }}
                className="py-2 px-4"
              >
                <div className="flex w-screen max-w-[135px] flex-col gap-1 truncate">
                  <div className="h-4 animate-pulse rounded bg-gray-80 dark:bg-gray-20" />
                </div>
              </TableCell>
              <TableCell
                style={{
                  width: '20%',
                }}
                className="py-2 px-4"
              >
                <div className="h-4 animate-pulse rounded bg-gray-80 dark:bg-gray-20" />
              </TableCell>
            </TableRow>
          ))}
        </>
      ))}
    </>
  );
};
