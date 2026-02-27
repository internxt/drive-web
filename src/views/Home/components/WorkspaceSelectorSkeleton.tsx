interface WorkspaceSelectorSkeletonProps {
  isCollapsed?: boolean;
}

const WorkspaceSelectorSkeleton: React.FC<WorkspaceSelectorSkeletonProps> = ({ isCollapsed = false }) => {
  return (
    <div className="relative mb-2 inline-block w-full">
      <div
        className={`w-full justify-center rounded-lg border border-gray-10 bg-surface ${
          isCollapsed ? 'p-2' : 'p-3'
        } text-left dark:bg-gray-5`}
      >
        {isCollapsed ? (
          <div className="flex items-center justify-center">
            {/* Avatar */}
            <div className="h-7 w-7 animate-pulse rounded-full bg-gray-10 dark:bg-gray-20" />
          </div>
        ) : (
          <div className="flex w-full flex-row items-center justify-between space-x-2">
            {/* Avatar */}
            <div className="h-7 w-7 animate-pulse rounded-full bg-gray-10 dark:bg-gray-20" />
            <div className="flex grow flex-col space-y-1.5 truncate">
              {/* Name */}
              <div className="h-3.5 w-24 animate-pulse rounded bg-gray-10 dark:bg-gray-20" />
              {/* Type */}
              <div className="h-3 w-16 animate-pulse rounded bg-gray-10 dark:bg-gray-20" />
            </div>
            {/* Icon */}
            <div className="h-4 w-4 animate-pulse rounded bg-gray-10 dark:bg-gray-20" />
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkspaceSelectorSkeleton;
