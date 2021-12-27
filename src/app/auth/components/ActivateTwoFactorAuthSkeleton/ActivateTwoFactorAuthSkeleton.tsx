import Skeleton from 'react-loading-skeleton';

const ActivateTwoFactorAuthSkeleton = (): JSX.Element => {
  return (
    <div className="relative flex flex-col w-full items-center">
      <div className="relative flex flex-col w-32 h-10 rounded-xl overflow-hidden">
        <Skeleton className="absolute top-0 left-0 w-full h-full" />
      </div>
    </div>
  );
};

export default ActivateTwoFactorAuthSkeleton;
