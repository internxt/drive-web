import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import { useMemo } from 'react';
import dateService from 'services/date.service';
import { DayKey, Photo } from '../types';
import PhotoTile from './PhotoTile';

interface PhotosTimelineProps {
  photos: Photo[];
}

interface PhotosOfDay {
  day: DayKey;
  photos: Photo[];
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

const PhotosTimeline = ({ photos }: PhotosTimelineProps): JSX.Element => {
  const { translate } = useTranslationContext();
  const days = useMemo(() => groupByDayNewestFirst(photos), [photos]);

  const getDayLabel = (day: DayKey): string => {
    if (dateService.isToday(day)) return translate('views.photos.timeline.today');
    if (dateService.isYesterday(day)) return translate('views.photos.timeline.yesterday');
    return dateService.format(day, 'ddd, D MMM YYYY');
  };

  return (
    <div className="flex flex-col gap-6 px-5 pb-6">
      {days.map(({ day, photos: photosOfDay }) => {
        const dayLabel = getDayLabel(day);

        return (
          <section key={day} aria-label={dayLabel} className="flex flex-col gap-2">
            <h2 className="text-sm font-medium text-gray-80">{dayLabel}</h2>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-1">
              {photosOfDay.map((photo) => (
                <PhotoTile key={photo.uuid} photo={photo} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
};

export default PhotosTimeline;
