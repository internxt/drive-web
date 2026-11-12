import { CSSProperties } from 'react';
import { DayKey, MonthKey, Photo } from '../types';

const MIN_TILE_SIZE = 160;
export const TILE_GAP = 4;
export const SIDE_PADDING = 20;
export const DAY_GAP = 24;

type TimelineRow = { kind: 'photos'; photos: Photo[] } | { kind: 'monthError'; month: MonthKey };

interface PhotosOfDay {
  day: DayKey;
  photos: Photo[];
}

export interface Timeline {
  days: DayKey[];
  rowsPerDay: number[];
  rows: TimelineRow[];
  isLastRowOfDay: boolean[];
}

export const sortPhotosNewestFirst = (photos: Photo[]): Photo[] =>
  [...photos].sort(
    (photo, otherPhoto) => otherPhoto.day.localeCompare(photo.day) || otherPhoto.takenAt.localeCompare(photo.takenAt),
  );

export const groupByDay = (photos: Photo[]): PhotosOfDay[] => {
  const days: PhotosOfDay[] = [];

  for (const photo of photos) {
    const lastDay = days.at(-1);
    if (lastDay?.day === photo.day) lastDay.photos.push(photo);
    else days.push({ day: photo.day, photos: [photo] });
  }

  return days;
};

export const getColumns = (width: number): number =>
  Math.max(1, Math.floor((width - 2 * SIDE_PADDING + TILE_GAP) / (MIN_TILE_SIZE + TILE_GAP)));

const splitIntoRows = (photos: Photo[], columns: number): Photo[][] => {
  const rows: Photo[][] = [];
  for (let start = 0; start < photos.length; start += columns) rows.push(photos.slice(start, start + columns));
  return rows;
};

export const getTimeline = (days: PhotosOfDay[], columns: number, failedMonths: MonthKey[]): Timeline => {
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

export const findRowOfPhoto = (timeline: Timeline, photoUuid: string): number =>
  timeline.rows.findIndex((row) => row.kind === 'photos' && row.photos.some(({ uuid }) => uuid === photoUuid));

export const getRowStyle = (columns: number, paddingBottom: number): CSSProperties => ({
  display: 'grid',
  gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
  gap: TILE_GAP,
  paddingInline: SIDE_PADDING,
  paddingBottom,
});
