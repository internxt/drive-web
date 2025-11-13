import Skeleton from 'react-loading-skeleton';

export const PlanSelectionCardSkeleton = () => {
  return (
    <div className={'rounded-2xl border border-gray-10 bg-surface dark:border-highlight/10 dark:bg-highlight/5'}>
      <div
        className={
          'flex w-full flex-col rounded-xl border-2 border-transparent p-4 ring-offset-2 ring-offset-transparent'
        }
      >
        <div className="flex w-full flex-row justify-between">
          <div className="animate-pulse dark:opacity-30">
            <Skeleton width={80} height={28} />
          </div>
        </div>
        <div className="animate-pulse dark:opacity-30">
          <Skeleton width={100} height={20} />
        </div>
      </div>
    </div>
  );
};
