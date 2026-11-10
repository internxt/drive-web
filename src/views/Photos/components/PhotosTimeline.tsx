import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { GroupedVirtuoso, GroupedVirtuosoHandle, ListRange } from 'react-virtuoso';
import { useElementSize } from '../hooks/useElementSize';
import { PhotoSelection } from '../hooks/usePhotoSelection';
import { PhotoThumbnailsService } from '../services/photoThumbnails.service';
import { MonthKey, Photo } from '../types';
import {
  DAY_GAP,
  findRowOfPhoto,
  getColumns,
  getRowStyle,
  getTimeline,
  groupByDay,
  SIDE_PADDING,
  Timeline,
  TILE_GAP,
} from '../utils/photoTimeline';
import PhotoGridItem from './PhotoGridItem';
import PhotosDayHeader from './PhotosDayHeader';
import PhotosMonthError from './PhotosMonthError';
import PhotosTimelineFooter from './PhotosTimelineFooter';

interface PhotosTimelineProps {
  photos: Photo[];
  failedMonths: MonthKey[];
  isLoadingMore: boolean;
  onEndReached: () => void;
  onRetryMonth: (month: MonthKey) => void;
  selectedPhotos: PhotoSelection;
  onOpenPhoto: (photo: Photo) => void;
  onToggleSelection: (photos: Photo[]) => void;
}

const PhotosTimeline = ({
  photos,
  failedMonths,
  isLoadingMore,
  onEndReached,
  onRetryMonth,
  selectedPhotos,
  onOpenPhoto,
  onToggleSelection,
}: PhotosTimelineProps): JSX.Element => {
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const [scroller, setScroller] = useState<HTMLElement | null>(null);
  const virtuosoRef = useRef<GroupedVirtuosoHandle>(null);
  const photoInTheMiddleUuid = useRef<string>();
  const shownTimeline = useRef<Timeline>();
  const { height } = useElementSize(container);
  const { width: widthWithoutScrollbar } = useElementSize(scroller);
  const columns = getColumns(widthWithoutScrollbar);
  const days = useMemo(() => groupByDay(photos), [photos]);
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
          components={{ Footer: PhotosTimelineFooter }}
          groupContent={(dayIndex) => (
            <PhotosDayHeader
              day={days[dayIndex].day}
              photos={days[dayIndex].photos}
              selectedPhotos={selectedPhotos}
              onToggleSelection={onToggleSelection}
            />
          )}
          itemContent={(rowIndex) => {
            const row = timeline.rows[rowIndex];
            const paddingBottom = timeline.isLastRowOfDay[rowIndex] ? DAY_GAP : TILE_GAP;
            if (row.kind === 'monthError') {
              return (
                <div style={{ paddingInline: SIDE_PADDING, paddingBottom }}>
                  <PhotosMonthError month={row.month} onRetry={() => onRetryMonth(row.month)} />
                </div>
              );
            }
            return (
              <div style={getRowStyle(columns, paddingBottom)}>
                {row.photos.map((photo) => (
                  <PhotoGridItem
                    key={photo.uuid}
                    photo={photo}
                    isSelected={selectedPhotos.has(photo.uuid)}
                    isSelecting={selectedPhotos.size > 0}
                    onOpen={onOpenPhoto}
                    onToggleSelection={onToggleSelection}
                  />
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
