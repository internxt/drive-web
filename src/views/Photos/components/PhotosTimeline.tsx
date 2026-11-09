import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import { Translate } from 'app/i18n/types';
import { memo, useCallback, useEffect, useMemo, useRef } from 'react';
import { ListChildComponentProps, ListOnItemsRenderedProps, VariableSizeList } from 'react-window';
import dateService from 'services/date.service';
import { useElementSize } from '../hooks/useElementSize';
import { DayKey, Photo } from '../types';
import PhotoGridItem from './PhotoGridItem';
import PhotosErrorState from './PhotosErrorState';

const MIN_TILE_SIZE = 160;
const TILE_GAP = 4;
const SIDE_PADDING = 20;
const DAY_HEADER_HEIGHT = 40;
const ERROR_ROW_HEIGHT = 280;
const OVERSCAN_ROW_COUNT = 2;
const NEAR_END_ROW_COUNT = 3;

export type TimelineEnd = 'loading' | 'error' | null;

interface PhotosTimelineProps {
  photos: Photo[];
  end: TimelineEnd;
  onEndReached: () => void;
  onRetry: () => void;
}

interface PhotosOfDay {
  day: DayKey;
  photos: Photo[];
}

type TimelineRow =
  | { kind: 'day'; label: string }
  | { kind: 'photos'; label: string; photos: Photo[] }
  | { kind: 'loading' }
  | { kind: 'error' };

interface TimelineLayout {
  rows: TimelineRow[];
  columns: number;
  tileSize: number;
}

interface TimelineRowData extends TimelineLayout {
  onRetry: () => void;
}

const groupByDayNewestFirst = (photos: Photo[]): PhotosOfDay[] => {
  const photosNewestFirst = [...photos].sort(
    (photo, otherPhoto) => otherPhoto.day.localeCompare(photo.day) || otherPhoto.takenAt.localeCompare(photo.takenAt),
  );
  const days: PhotosOfDay[] = [];

  for (const photo of photosNewestFirst) {
    const lastDay = days.at(-1);
    if (lastDay?.day === photo.day) lastDay.photos.push(photo);
    else days.push({ day: photo.day, photos: [photo] });
  }

  return days;
};

const getDayLabel = (day: DayKey, translate: Translate): string => {
  if (dateService.isToday(day)) return translate('views.photos.timeline.today');
  if (dateService.isYesterday(day)) return translate('views.photos.timeline.yesterday');
  return dateService.format(day, 'ddd, D MMM YYYY');
};

const splitIntoRows = (photos: Photo[], columns: number): Photo[][] => {
  const rows: Photo[][] = [];
  for (let start = 0; start < photos.length; start += columns) rows.push(photos.slice(start, start + columns));
  return rows;
};

const getTimelineLayout = (
  days: PhotosOfDay[],
  end: TimelineEnd,
  width: number,
  translate: Translate,
): TimelineLayout => {
  const gridWidth = width - 2 * SIDE_PADDING;
  const columns = Math.max(1, Math.floor((gridWidth + TILE_GAP) / (MIN_TILE_SIZE + TILE_GAP)));
  const tileSize = (gridWidth - (columns - 1) * TILE_GAP) / columns;

  const dayRows = days.flatMap(({ day, photos }): TimelineRow[] => {
    const label = getDayLabel(day, translate);
    const photoRows = splitIntoRows(photos, columns).map(
      (rowPhotos): TimelineRow => ({
        kind: 'photos',
        label,
        photos: rowPhotos,
      }),
    );
    return [{ kind: 'day', label }, ...photoRows];
  });
  const rows: TimelineRow[] = end ? [...dayRows, { kind: end }] : dayRows;

  return { rows, columns, tileSize };
};

const TimelineRowView = memo(({ index, style, data }: ListChildComponentProps<TimelineRowData>): JSX.Element => {
  const row = data.rows[index];
  const gridStyle = { ...style, gridTemplateColumns: `repeat(${data.columns}, minmax(0, 1fr))` };

  switch (row.kind) {
    case 'day':
      return (
        <h2 style={style} className="flex items-end px-5 pb-2 text-sm font-medium text-gray-80">
          {row.label}
        </h2>
      );
    case 'photos':
      return (
        <div role="group" aria-label={row.label} style={gridStyle} className="grid items-start gap-1 px-5">
          {row.photos.map((photo) => (
            <PhotoGridItem key={photo.uuid} photo={photo} />
          ))}
        </div>
      );
    case 'loading':
      return (
        <div aria-hidden style={gridStyle} className="grid items-start gap-1 px-5">
          {Array.from({ length: data.columns }, (_, column) => (
            <div key={column} className="aspect-square animate-pulse rounded bg-gray-10 dark:bg-gray-20" />
          ))}
        </div>
      );
    case 'error':
      return (
        <div style={style} className="flex flex-col">
          <PhotosErrorState onRetry={data.onRetry} />
        </div>
      );
  }
});

const PhotosTimeline = ({ photos, end, onEndReached, onRetry }: PhotosTimelineProps): JSX.Element => {
  const { translate } = useTranslationContext();
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<VariableSizeList<TimelineRowData>>(null);
  const lastVisibleRowRef = useRef(0);
  const { width, height } = useElementSize(containerRef);
  const days = useMemo(() => groupByDayNewestFirst(photos), [photos]);
  const layout = useMemo(() => getTimelineLayout(days, end, width, translate), [days, end, width, translate]);
  const rowData = useMemo(() => ({ ...layout, onRetry }), [layout, onRetry]);

  useEffect(() => {
    listRef.current?.resetAfterIndex(0);
  }, [layout]);

  const loadMoreIfNearEnd = useCallback(() => {
    const isNearEnd = lastVisibleRowRef.current >= layout.rows.length - 1 - NEAR_END_ROW_COUNT;
    if (isNearEnd) onEndReached();
  }, [layout.rows.length, onEndReached]);

  useEffect(loadMoreIfNearEnd, [loadMoreIfNearEnd]);

  const onItemsRendered = ({ visibleStopIndex }: ListOnItemsRenderedProps) => {
    lastVisibleRowRef.current = visibleStopIndex;
    loadMoreIfNearEnd();
  };

  const photoRowHeight = layout.tileSize + TILE_GAP;
  const getRowHeight = (index: number): number => {
    const { kind } = layout.rows[index];
    if (kind === 'day') return DAY_HEADER_HEIGHT;
    if (kind === 'error') return ERROR_ROW_HEIGHT;
    return photoRowHeight;
  };

  return (
    <div ref={containerRef} className="min-h-0 grow">
      {width > 0 && (
        <VariableSizeList
          ref={listRef}
          width={width}
          height={height}
          itemCount={layout.rows.length}
          itemSize={getRowHeight}
          estimatedItemSize={photoRowHeight}
          itemData={rowData}
          overscanCount={OVERSCAN_ROW_COUNT}
          onItemsRendered={onItemsRendered}
        >
          {TimelineRowView}
        </VariableSizeList>
      )}
    </div>
  );
};

export default PhotosTimeline;
