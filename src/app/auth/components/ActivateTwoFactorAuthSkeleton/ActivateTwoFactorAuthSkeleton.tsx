import Skeleton from 'react-loading-skeleton';

const ActivateTwoFactorAuthSkeleton = (): JSX.Element => {
  return (
    <div className="mx-auto max-w-xl w-full">
      <div className="grid grid-cols-4 gap-x-3 mb-2">
        <Skeleton className="square"></Skeleton>
        <Skeleton className="square"></Skeleton>
        <Skeleton className="square"></Skeleton>
        <Skeleton className="square"></Skeleton>
      </div>
      <Skeleton className="w-full square"></Skeleton>
    </div>
  );
};

export default ActivateTwoFactorAuthSkeleton;
