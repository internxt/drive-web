import { RadioButton } from '@internxt/ui';
import SearchFilterRow from './SearchFilterRow';

interface SearchFilterRadioListProps<T extends string> {
  anyLabel: string;
  items: { id: T; label: string }[];
  selected: T | 'any';
  onSelect: (id: T | 'any') => void;
}

const SearchFilterRadioList = <T extends string>({
  anyLabel,
  items,
  selected,
  onSelect,
}: SearchFilterRadioListProps<T>): JSX.Element => (
  <div role="none" onMouseDown={(event) => event.preventDefault()} onClick={(event) => event.preventDefault()}>
    <SearchFilterRow onClick={() => onSelect('any')}>
      <RadioButton checked={selected === 'any'} onClick={() => onSelect('any')} />
      <p className="text-gray-100">{anyLabel}</p>
    </SearchFilterRow>
    <div className="mx-4 border-t border-gray-10" />
    {items.map(({ id, label }) => (
      <SearchFilterRow onClick={() => onSelect(id)} key={id}>
        <RadioButton checked={selected === id} onClick={() => onSelect(id)} />
        <p className="text-gray-100">{label}</p>
      </SearchFilterRow>
    ))}
  </div>
);

export default SearchFilterRadioList;
