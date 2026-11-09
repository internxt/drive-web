import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import { Translate } from 'app/i18n/types';
import { memo, useEffect, useMemo, useRef } from 'react';
import { ListChildComponentProps, VariableSizeList } from 'react-window';
import dateService from 'services/date.service';
import { useElementSize } from '../hooks/useElementSize';
import { DayKey, Photo } from '../types';
import PhotoGridItem from './PhotoGridItem';

const MIN_TILE_SIZE = 160;
const TILE_GAP = 4;
const SIDE_PADDING = 20;
const DAY_HEADER_HEIGHT = 40;
const OVERSCAN_ROW_COUNT = 2;

interface PhotosTimelineProps {
  photos: Photo[];
}

interface PhotosOfDay {
  day: DayKey;
  photos: Photo[];
}

type TimelineRow = { kind: 'day'; label: string } | { kind: 'photos'; label: string; photos: Photo[] };

interface TimelineLayout {
  rows: TimelineRow[];
  columns: number;
  tileSize: number;
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

const getTimelineLayout = (days: PhotosOfDay[], width: number, translate: Translate): TimelineLayout => {
  const gridWidth = width - 2 * SIDE_PADDING;
  const columns = Math.max(1, Math.floor((gridWidth + TILE_GAP) / (MIN_TILE_SIZE + TILE_GAP)));
  const tileSize = (gridWidth - (columns - 1) * TILE_GAP) / columns;

  const rows = days.flatMap(({ day, photos }): TimelineRow[] => {
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

  return { rows, columns, tileSize };
};

const TimelineRowView = memo(({ index, style, data }: ListChildComponentProps<TimelineLayout>): JSX.Element => {
  const row = data.rows[index];

  if (row.kind === 'day') {
    return (
      <h2 style={style} className="flex items-end px-5 pb-2 text-sm font-medium text-gray-80">
        {row.label}
      </h2>
    );
  }

  return (
    <div
      role="group"
      aria-label={row.label}
      style={{ ...style, gridTemplateColumns: `repeat(${data.columns}, minmax(0, 1fr))` }}
      className="grid items-start gap-1 px-5"
    >
      {row.photos.map((photo) => (
        <PhotoGridItem key={photo.uuid} photo={photo} />
      ))}
    </div>
  );
});

const PhotosTimeline = ({ photos }: PhotosTimelineProps): JSX.Element => {
  const { translate } = useTranslationContext();
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<VariableSizeList<TimelineLayout>>(null);
  const { width, height } = useElementSize(containerRef);
  const days = useMemo(() => groupByDayNewestFirst(photos), [photos]);
  const layout = useMemo(() => getTimelineLayout(days, width, translate), [days, width, translate]);

  useEffect(() => {
    listRef.current?.resetAfterIndex(0);
  }, [layout]);

  const photoRowHeight = layout.tileSize + TILE_GAP;
  const getRowHeight = (index: number): number =>
    layout.rows[index].kind === 'day' ? DAY_HEADER_HEIGHT : photoRowHeight;

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
          itemData={layout}
          overscanCount={OVERSCAN_ROW_COUNT}
        >
          {TimelineRowView}
        </VariableSizeList>
      )}
    </div>
  );
};

export default PhotosTimeline;
