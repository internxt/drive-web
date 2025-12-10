export const VersionHistorySkeleton = () => {
  return (
    <div className="space-y-0">
      <div className="border-b-[2.5px] border-gray-5 px-5 py-3">
        <div className="flex flex-col space-y-2">
          <div className="flex items-center justify-between">
            <div className="h-5 w-32 animate-pulse rounded bg-gray-10 dark:bg-gray-20" />
            <div className="h-5 w-20 animate-pulse rounded bg-gray-10 dark:bg-gray-20" />
          </div>
          <div className="flex items-center space-x-2">
            <div className="h-6 w-6 animate-pulse rounded-full bg-gray-10 dark:bg-gray-20" />
            <div className="h-4 w-24 animate-pulse rounded bg-gray-10 dark:bg-gray-20" />
          </div>
        </div>
      </div>

      {Array.from({ length: 3 }, (_, index) => (
        <div key={`skeleton-${index}`} className="border-b-[2.5px] border-gray-5 px-6 py-3">
          <div className="flex flex-col space-y-2">
            <div className="h-5 w-32 animate-pulse rounded bg-gray-10 dark:bg-gray-20" />
            <div className="flex items-center space-x-2 pt-1">
              <div className="h-6 w-6 animate-pulse rounded-full bg-gray-10 dark:bg-gray-20" />
              <div className="h-4 w-24 animate-pulse rounded bg-gray-10 dark:bg-gray-20" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
