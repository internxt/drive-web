import { Photo } from '../types';

/** The order of the gallery: newest day first and, within a day, newest photo first, whatever its device. */
export const sortPhotosNewestFirst = (photos: Photo[]): Photo[] =>
  [...photos].sort(
    (photo, otherPhoto) => otherPhoto.day.localeCompare(photo.day) || otherPhoto.takenAt.localeCompare(photo.takenAt),
  );
