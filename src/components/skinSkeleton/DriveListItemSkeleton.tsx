import Skeleton from 'react-loading-skeleton';

const DriveListItemSkeleton = (): JSX.Element => {
  return (
    <div className="py-3.5 border-b border-l-neutral-30 w-full flex">
      <div className="w-0.5/12 px-3 flex items-center justify-center box-content"></div>
      <div className="w-0.5/12 px-3 flex items-center box-content">
        <Skeleton circle={true} height={25} width={25} />
      </div>
      <div className="flex-grow flex items-center w-1">
        <Skeleton width={300} />
      </div>
      <div className="w-2/12 hidden items-center xl:flex"></div>
      <div className="w-3/12 hidden items-center lg:flex">
        <Skeleton width={150} />
      </div>
      <div className="w-2/12 flex items-center">
        <Skeleton width={50} />
      </div>
      <div className="w-1/12 flex items-center rounded-tr-4px">
        <Skeleton circle={true} height={25} width={25} />
      </div>
    </div>
  );
};

export default DriveListItemSkeleton;