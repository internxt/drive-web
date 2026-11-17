import { getRowStyle, TILE_GAP } from '../utils/photoTimeline';

interface PhotosTimelineFooterContext {
  isLoadingMore: boolean;
  columns: number;
}

const PhotosTimelineFooter = ({ context }: { context: PhotosTimelineFooterContext }): JSX.Element | null => {
  if (!context.isLoadingMore) return null;
  return (
    <div aria-hidden style={getRowStyle(context.columns, TILE_GAP)}>
      {Array.from({ length: context.columns }, (_, column) => (
        <div key={column} className="aspect-square animate-pulse rounded bg-gray-10 dark:bg-gray-20" />
      ))}
    </div>
  );
};

export default PhotosTimelineFooter;
