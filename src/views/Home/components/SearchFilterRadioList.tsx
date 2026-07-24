import { RadioButton } from '@internxt/ui';

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
    <div className="flex flex-row items-center gap-2 px-4 py-2">
      <RadioButton checked={selected === 'any'} onClick={() => onSelect('any')} />
      <p className="text-gray-100">{anyLabel}</p>
    </div>
    <div className="mx-4 border-t border-gray-10" />
    {items.map(({ id, label }) => (
      <div className="flex flex-row items-center gap-2 px-4 py-2" key={id}>
        <RadioButton checked={selected === id} onClick={() => onSelect(id)} />
        <p className="text-gray-100">{label}</p>
      </div>
    ))}
  </div>
);

export default SearchFilterRadioList;
