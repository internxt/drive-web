interface SkinSkeletonProps {
  skinSkeleton: Array<any> | undefined;
  columns: Array<string>;
}

export default function SkinSkeletonItem({ skinSkeleton, columns }: SkinSkeletonProps): JSX.Element {
  return (
    <div className="group relative flex h-14 animate-pulse flex-row items-center pl-14 pr-5">
      {new Array(columns.length).fill(0).map((col, i) => (
        <div
          key={`${col}-${i}`}
          className={`relative flex h-full shrink-0 flex-row items-center overflow-hidden whitespace-nowrap border-b border-gray-5 ${columns[i]}`}
        >
          {skinSkeleton?.[i]}
        </div>
      ))}
    </div>
  );
}
