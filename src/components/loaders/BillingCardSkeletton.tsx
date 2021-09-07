import Skeleton from 'react-loading-skeleton';

const BillingCardSkeletton = (): JSX.Element => {
  return (
    <div className="w-56 h-120 flex flex-col justify-center text-neutral-700 px-2">
      <Skeleton width={100} height={40} />

      <p className="text-sm mt-4 mb-2">
        <Skeleton />
      </p>

      {Array(3)
        .fill(1)
        .map((n, i) => (
          <Skeleton width={200} height={44} className="mb-2" key={i} />
        ))}

      <Skeleton width={180} height={10} className="my-3" />

      {Array(3)
        .fill(1)
        .map((n, i) => (
          <Skeleton width={200} height={15} className="mb-2" key={i} />
        ))}

      <div className="mt-4" />
      <Skeleton height={36} className="w-full" />
    </div>
  );
};

export default BillingCardSkeletton;
