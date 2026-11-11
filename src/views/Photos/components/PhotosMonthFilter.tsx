import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import dateService from 'services/date.service';
import { MonthKey } from '../types';
import PhotosFilterMenu from './PhotosFilterMenu';

interface PhotosMonthFilterProps {
  months: MonthKey[];
  selectedMonth: MonthKey | null;
  onSelect: (month: MonthKey | null) => void;
}

const PhotosMonthFilter = ({ months, selectedMonth, onSelect }: PhotosMonthFilterProps): JSX.Element => {
  const { translate } = useTranslationContext();

  return (
    <PhotosFilterMenu
      allLabel={translate('views.photos.filters.allDates')}
      options={months.map((month) => ({
        id: month,
        label: dateService.format(month, 'MMMM YYYY'),
      }))}
      selectedId={selectedMonth}
      onSelect={onSelect}
    />
  );
};

export default PhotosMonthFilter;
