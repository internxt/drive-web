import { Button } from '@internxt/ui';
import { WarningCircleIcon } from '@phosphor-icons/react';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import { Translate } from 'app/i18n/types';
import { CSSProperties, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { GroupedVirtuoso, GroupedVirtuosoHandle, ListRange } from 'react-virtuoso';
import dateService from 'services/date.service';
import { useElementSize } from '../hooks/useElementSize';
import { PhotoThumbnailsService } from '../services/photoThumbnails.service';
import { DayKey, MonthKey, Photo } from '../types';
import PhotoGridItem from './PhotoGridItem';

const MIN_TILE_SIZE = 160;
const TILE_GAP = 4;
const SIDE_PADDING = 20;
const DAY_GAP = 24;

interface PhotosTimelineProps {
  photos: Photo[];
  failedMonths: MonthKey[];
  isLoadingMore: boolean;
  onEndReached: () => void;
  onRetryMonth: (month: MonthKey) => void;
}

interface TimelineFooterContext {
  isLoadingMore: boolean;
  columns: number;
}

type TimelineRow = { kind: 'photos'; photos: Photo[] } | { kind: 'monthError'; month: MonthKey };

interface PhotosOfDay {
  day: DayKey;
  photos: Photo[];
}

interface Timeline {
  days: DayKey[];
  rowsPerDay: number[];
  rows: TimelineRow[];
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

const getTimeline = (days: PhotosOfDay[], columns: number, failedMonths: MonthKey[]): Timeline => {
  const rowsOfEachDay = days.map(({ photos }) =>
    splitIntoRows(photos, columns).map((rowPhotos): TimelineRow => ({ kind: 'photos', photos: rowPhotos })),
  );
  for (const month of failedMonths) {
    const daysUntilMonthEnd = days.filter(({ day }) => day.slice(0, 7) >= month).length;
    rowsOfEachDay[Math.max(0, daysUntilMonthEnd - 1)].push({ kind: 'monthError', month });
  }
  return {
    days: days.map(({ day }) => day),
    rowsPerDay: rowsOfEachDay.map((rows) => rows.length),
    rows: rowsOfEachDay.flat(),
    isLastRowOfDay: rowsOfEachDay.flatMap((rows) => rows.map((_, index) => index === rows.length - 1)),
  };
};

const findRowOfPhoto = (timeline: Timeline, photoUuid: string): number =>
  timeline.rows.findIndex((row) => row.kind === 'photos' && row.photos.some(({ uuid }) => uuid === photoUuid));

const getRowStyle = (columns: number, paddingBottom: number): CSSProperties => ({
  display: 'grid',
  gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
  gap: TILE_GAP,
  paddingInline: SIDE_PADDING,
  paddingBottom,
});

const TimelineFooter = ({ context }: { context: TimelineFooterContext }): JSX.Element | null => {
  if (!context.isLoadingMore) return null;
  return (
    <div aria-hidden style={getRowStyle(context.columns, TILE_GAP)}>
      {Array.from({ length: context.columns }, (_, column) => (
        <div key={column} className="aspect-square animate-pulse rounded bg-gray-10 dark:bg-gray-20" />
      ))}
    </div>
  );
};

const MonthError = ({ month, onRetry }: { month: MonthKey; onRetry: () => void }): JSX.Element => {
  const { translate } = useTranslationContext();

  return (
    <div className="flex items-center gap-2 rounded-lg bg-red/10 py-2 pl-4 pr-2 text-sm">
      <WarningCircleIcon size={20} weight="fill" className="shrink-0 text-red" />
      <span className="grow">
        {translate('views.photos.timeline.monthError', { month: dateService.format(month, 'MMMM YYYY') })}
      </span>
      <Button variant="ghost" className="text-red" onClick={onRetry}>
        {translate('views.photos.error.retry')}
      </Button>
    </div>
  );
};

const PhotosTimeline = ({
  photos,
  failedMonths,
  isLoadingMore,
  onEndReached,
  onRetryMonth,
}: PhotosTimelineProps): JSX.Element => {
  const { translate } = useTranslationContext();
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const [scroller, setScroller] = useState<HTMLElement | null>(null);
  const virtuosoRef = useRef<GroupedVirtuosoHandle>(null);
  const photoInTheMiddleUuid = useRef<string>();
  const shownTimeline = useRef<Timeline>();
  const { height } = useElementSize(container);
  const { width: widthWithoutScrollbar } = useElementSize(scroller);
  const columns = getColumns(widthWithoutScrollbar);
  const days = useMemo(() => groupByDayNewestFirst(photos), [photos]);
  const timeline = useMemo(() => getTimeline(days, columns, failedMonths), [days, columns, failedMonths]);

  useLayoutEffect(() => {
    const previousTimeline = shownTimeline.current;
    shownTimeline.current = timeline;
    const photoUuid = photoInTheMiddleUuid.current;
    if (!previousTimeline || !photoUuid) return;

    const rowIndex = findRowOfPhoto(timeline, photoUuid);
    if (rowIndex !== -1 && rowIndex !== findRowOfPhoto(previousTimeline, photoUuid)) {
      virtuosoRef.current?.scrollToIndex({ index: rowIndex, align: 'center' });
    }
  }, [timeline]);

  const rememberPhotoInTheMiddle = ({ startIndex, endIndex }: ListRange) => {
    if (timeline !== shownTimeline.current) return;
    if (startIndex === 0) {
      photoInTheMiddleUuid.current = undefined;
      return;
    }
    const middleRow = timeline.rows[Math.ceil((startIndex + endIndex) / 2)];
    if (middleRow?.kind !== 'photos' || middleRow.photos.some(({ uuid }) => uuid === photoInTheMiddleUuid.current)) {
      return;
    }
    photoInTheMiddleUuid.current = middleRow.photos[Math.floor(middleRow.photos.length / 2)].uuid;
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
          isScrolling={(isScrolling) =>
            isScrolling
              ? PhotoThumbnailsService.instance.pauseDownloads()
              : PhotoThumbnailsService.instance.resumeDownloads()
          }
          context={{ isLoadingMore, columns }}
          components={{ Footer: TimelineFooter }}
          groupContent={(dayIndex) => (
            <h2 className="bg-surface pb-2 text-sm font-medium text-gray-80" style={{ paddingInline: SIDE_PADDING }}>
              {getDayLabel(timeline.days[dayIndex], translate)}
            </h2>
          )}
          itemContent={(rowIndex) => {
            const row = timeline.rows[rowIndex];
            const paddingBottom = timeline.isLastRowOfDay[rowIndex] ? DAY_GAP : TILE_GAP;
            if (row.kind === 'monthError') {
              return (
                <div style={{ paddingInline: SIDE_PADDING, paddingBottom }}>
                  <MonthError month={row.month} onRetry={() => onRetryMonth(row.month)} />
                </div>
              );
            }
            return (
              <div style={getRowStyle(columns, paddingBottom)}>
                {row.photos.map((photo) => (
                  <PhotoGridItem key={photo.uuid} photo={photo} />
                ))}
              </div>
            );
          }}
        />
      )}
    </div>
  );
};

export default PhotosTimeline;
