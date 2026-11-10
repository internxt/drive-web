import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import { Translate } from 'app/i18n/types';
import { CSSProperties, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { GroupedVirtuoso, GroupedVirtuosoHandle, ListRange } from 'react-virtuoso';
import dateService from 'services/date.service';
import { useElementSize } from '../hooks/useElementSize';
import { DayKey, Photo } from '../types';
import PhotoGridItem from './PhotoGridItem';
import PhotosErrorState from './PhotosErrorState';

const MIN_TILE_SIZE = 160;
const TILE_GAP = 4;
const SIDE_PADDING = 20;
const DAY_GAP = 24;

export type TimelineEnd = 'loading' | 'error' | null;

interface PhotosTimelineProps {
  photos: Photo[];
  end: TimelineEnd;
  onEndReached: () => void;
  onRetry: () => void;
}

interface TimelineFooterContext {
  end: TimelineEnd;
  columns: number;
  onRetry: () => void;
}

interface PhotosOfDay {
  day: DayKey;
  photos: Photo[];
}

interface Timeline {
  days: DayKey[];
  rowsPerDay: number[];
  rows: Photo[][];
  isLastRowOfDay: boolean[];
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

const getColumns = (width: number): number =>
  Math.max(1, Math.floor((width - 2 * SIDE_PADDING + TILE_GAP) / (MIN_TILE_SIZE + TILE_GAP)));

const splitIntoRows = (photos: Photo[], columns: number): Photo[][] => {
  const rows: Photo[][] = [];
  for (let start = 0; start < photos.length; start += columns) rows.push(photos.slice(start, start + columns));
  return rows;
};

const getTimeline = (days: PhotosOfDay[], columns: number): Timeline => {
  const rowsOfEachDay = days.map(({ photos }) => splitIntoRows(photos, columns));
  return {
    days: days.map(({ day }) => day),
    rowsPerDay: rowsOfEachDay.map((rows) => rows.length),
    rows: rowsOfEachDay.flat(),
    isLastRowOfDay: rowsOfEachDay.flatMap((rows) => rows.map((_, index) => index === rows.length - 1)),
  };
};

const getRowStyle = (columns: number, paddingBottom: number): CSSProperties => ({
  display: 'grid',
  gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
  gap: TILE_GAP,
  paddingInline: SIDE_PADDING,
  paddingBottom,
});

const TimelineFooter = ({ context }: { context: TimelineFooterContext }): JSX.Element | null => {
  switch (context.end) {
    case 'loading':
      return (
        <div aria-hidden style={getRowStyle(context.columns, TILE_GAP)}>
          {Array.from({ length: context.columns }, (_, column) => (
            <div key={column} className="aspect-square animate-pulse rounded bg-gray-10 dark:bg-gray-20" />
          ))}
        </div>
      );
    case 'error':
      return <PhotosErrorState onRetry={context.onRetry} />;
    default:
      return null;
  }
};

const PhotosTimeline = ({ photos, end, onEndReached, onRetry }: PhotosTimelineProps): JSX.Element => {
  const { translate } = useTranslationContext();
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const [scroller, setScroller] = useState<HTMLElement | null>(null);
  const virtuosoRef = useRef<GroupedVirtuosoHandle>(null);
  const photoInTheMiddleUuid = useRef<string>();
  const shownColumns = useRef<number>();
  const { height } = useElementSize(container);
  const { width: widthWithoutScrollbar } = useElementSize(scroller);
  const columns = getColumns(widthWithoutScrollbar);
  const days = useMemo(() => groupByDayNewestFirst(photos), [photos]);
  const timeline = useMemo(() => getTimeline(days, columns), [days, columns]);

  useLayoutEffect(() => {
    if (columns === shownColumns.current) return;
    shownColumns.current = columns;
    if (!photoInTheMiddleUuid.current) return;

    const rowIndex = timeline.rows.findIndex((row) => row.some((photo) => photo.uuid === photoInTheMiddleUuid.current));
    if (rowIndex !== -1) virtuosoRef.current?.scrollToIndex({ index: rowIndex, align: 'center' });
  }, [timeline]);

  const rememberPhotoInTheMiddle = ({ startIndex, endIndex }: ListRange) => {
    if (columns !== shownColumns.current) return;
    if (startIndex === 0) {
      photoInTheMiddleUuid.current = undefined;
      return;
    }
    const middleRow = timeline.rows[Math.ceil((startIndex + endIndex) / 2)];
    if (!middleRow || middleRow.some((photo) => photo.uuid === photoInTheMiddleUuid.current)) return;
    photoInTheMiddleUuid.current = middleRow[Math.floor(middleRow.length / 2)].uuid;
  };

  return (
    <div ref={setContainer} className="min-h-0 grow">
      {height > 0 && (
        <GroupedVirtuoso
          ref={virtuosoRef}
          scrollerRef={(element) => setScroller(element instanceof HTMLElement ? element : null)}
          style={{ height }}
          groupCounts={widthWithoutScrollbar > 0 ? timeline.rowsPerDay : []}
          rangeChanged={rememberPhotoInTheMiddle}
          endReached={onEndReached}
          context={{ end, columns, onRetry }}
          components={{ Footer: TimelineFooter }}
          groupContent={(dayIndex) => (
            <h2 className="bg-surface pb-2 text-sm font-medium text-gray-80" style={{ paddingInline: SIDE_PADDING }}>
              {getDayLabel(timeline.days[dayIndex], translate)}
            </h2>
          )}
          itemContent={(rowIndex) => (
            <div style={getRowStyle(columns, timeline.isLastRowOfDay[rowIndex] ? DAY_GAP : TILE_GAP)}>
              {timeline.rows[rowIndex].map((photo) => (
                <PhotoGridItem key={photo.uuid} photo={photo} />
              ))}
            </div>
          )}
        />
      )}
    </div>
  );
};

export default PhotosTimeline;
