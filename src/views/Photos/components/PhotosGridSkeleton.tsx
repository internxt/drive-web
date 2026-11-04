const SKELETON_TILES = 24;

const PhotosGridSkeleton = (): JSX.Element => (
  <div
    aria-hidden
    data-testid="photos-grid-skeleton"
    className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-1 px-5"
  >
    {Array.from({ length: SKELETON_TILES }, (_, index) => (
      <div key={index} className="aspect-square animate-pulse rounded bg-gray-10 dark:bg-gray-20" />
    ))}
  </div>
);

export default PhotosGridSkeleton;
