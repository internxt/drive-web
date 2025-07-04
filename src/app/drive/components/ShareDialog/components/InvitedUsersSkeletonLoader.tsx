export const InvitedUsersSkeletonLoader = () => {
  const skinSkeleton = [
    <div className="flex flex-row items-center space-x-4">
      <div className="h-9 w-9 rounded-md bg-gray-5" />
    </div>,
    <div className="h-4 w-72 rounded bg-gray-5" />,
    <div className="ml-3 h-4 w-24 rounded bg-gray-5" />,
  ];

  const columnsWidth = [
    {
      width: 'flex w-1/12 cursor-pointer items-center',
    },
    {
      width: 'flex grow cursor-pointer items-center pl-4',
    },
    {
      width: 'hidden w-3/12 lg:flex pl-4',
    },
  ].map((column) => column.width);

  return (
    <div className="group relative flex h-14 w-full shrink-0 animate-pulse flex-row items-center pl-2 pr-2">
      {new Array(5).fill(0).map((col, i) => (
        <div
          key={`${col}-${i}`}
          className={`relative flex h-full shrink-0 flex-row items-center overflow-hidden whitespace-nowrap border-b border-gray-5 ${columnsWidth[i]}`}
        >
          {skinSkeleton?.[i]}
        </div>
      ))}
      <div className="h-full w-12" />
    </div>
  );
};
