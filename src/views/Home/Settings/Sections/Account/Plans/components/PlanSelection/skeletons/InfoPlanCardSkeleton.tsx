import Skeleton from 'react-loading-skeleton';

export const InfoPlanCardSkeleton = () => {
  return (
    <div className={'flex w-80 flex-col rounded-xl border border-gray-10 bg-gray-5 p-4 '}>
      <div className="flex flex-col space-y-3">
        <div className="flex animate-pulse flex-col dark:opacity-30">
          <Skeleton width={50} height={28} />
          <Skeleton width={100} height={20} />
        </div>
      </div>
      <Divider />
      <PlanDetailsList />
    </div>
  );
};

const Divider = () => (
  <div className={'flex h-auto items-center justify-center py-6'}>
    <div className="h-px w-full bg-gray-10" />
  </div>
);

const PlanDetailsList = () => {
  return (
    <div className="flex flex-col space-y-2">
      <div className="animate-pulse dark:opacity-30">
        <Skeleton width={80} height={20} className="bg-surface" />
      </div>
      <div className="flex flex-col space-y-2">
        {new Array(8).fill(0).map((_, index) => (
          <div className="animate-pulse dark:opacity-30" key={index}>
            <Skeleton width={280} height={24} className="bg-surface" />
          </div>
        ))}
      </div>
    </div>
  );
};
