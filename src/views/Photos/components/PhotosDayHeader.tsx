import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import { Translate } from 'app/i18n/types';
import dateService from 'services/date.service';
import { PhotoSelection } from '../hooks/usePhotoSelection';
import { DayKey, Photo } from '../types';
import { SIDE_PADDING } from '../utils/photoTimeline';
import PhotosCheckbox from './PhotosCheckbox';

interface PhotosDayHeaderProps {
  day: DayKey;
  photos: Photo[];
  selectedPhotos: PhotoSelection;
  onToggleSelection: (photos: Photo[]) => void;
}

const getDayLabel = (day: DayKey, translate: Translate): string => {
  if (dateService.isToday(day)) return translate('views.photos.timeline.today');
  if (dateService.isYesterday(day)) return translate('views.photos.timeline.yesterday');
  return dateService.format(day, 'ddd, D MMM YYYY');
};

const PhotosDayHeader = ({ day, photos, selectedPhotos, onToggleSelection }: PhotosDayHeaderProps): JSX.Element => {
  const { translate } = useTranslationContext();
  const label = getDayLabel(day, translate);
  const selectedPhotosOfDay = photos.filter(({ uuid }) => selectedPhotos.has(uuid)).length;
  const isWholeDaySelected = selectedPhotosOfDay === photos.length;

  return (
    <div className="group flex items-center gap-2 bg-surface pb-2" style={{ paddingInline: SIDE_PADDING }}>
      <h2 className="text-sm font-medium text-gray-80">{label}</h2>
      <PhotosCheckbox
        label={label}
        checked={isWholeDaySelected}
        indeterminate={selectedPhotosOfDay > 0 && !isWholeDaySelected}
        onChange={() => onToggleSelection(photos)}
        className={selectedPhotos.size > 0 ? '' : 'opacity-0 focus:opacity-100 group-hover:opacity-100'}
      />
    </div>
  );
};

export default PhotosDayHeader;
