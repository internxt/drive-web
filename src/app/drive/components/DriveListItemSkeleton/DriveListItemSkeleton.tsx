import Skeleton from 'react-loading-skeleton';

const DriveListItemSkeleton = (): JSX.Element => {
  return (
    <div className="flex h-16 w-full border-b border-gray-5">
      <div className="box-content flex w-0.5/12 items-center justify-start pl-3 opacity-50"></div>
      <div className="box-content flex w-1/12 cursor-pointer items-center px-3 opacity-50">
        <Skeleton className="rounded-lg" height={32} width={32} />
      </div>
      <div className="flex grow cursor-pointer items-center opacity-50">
        <Skeleton width={256} />
      </div>
      <div className="hidden w-2/12 items-center opacity-50 xl:flex"></div>
      <div className="hidden w-3/12 cursor-pointer items-center opacity-50 lg:flex">
        <Skeleton width={150} />
      </div>
      <div className="flex w-1/12 cursor-pointer items-center opacity-50">
        <Skeleton width={80} />
      </div>
      <div className="rounded-tr-4px flex w-1/12 items-center opacity-50">
        <Skeleton circle={true} height={25} width={25} />
      </div>
    </div>
  );
};

export default DriveListItemSkeleton;
