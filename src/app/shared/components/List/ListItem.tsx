import { Check } from 'phosphor-react';

interface ItemProps {
  item: Record<string, unknown>;
  itemComposition: Array<(props: Record<string, unknown>, active: boolean) => JSX.Element>;
  selected: boolean;
  columns: Array<string>;
  onClick: () => void;
}

export default function ListItem({ item, itemComposition, selected, columns, onClick }: ItemProps): JSX.Element {
  return (
    <div
      onClick={onClick}
      className={`group relative flex h-14 flex-row items-center pl-14 pr-5 ${
        selected ? 'bg-primary bg-opacity-10 text-primary' : 'hover:bg-gray-1'
      }`}
    >
      {/* SELECTION CHECKBOX */}
      <div
        className={`absolute left-5 my-auto flex h-4 w-4 cursor-pointer flex-col items-center justify-center rounded text-white ${
          selected ? 'bg-primary' : 'border-gray-20 group-hover:border'
        }`}
      >
        <Check size={14} weight="bold" />
      </div>

      {/* COLUMNS */}
      {new Array(itemComposition.length).fill(0).map((col, i) => (
        <div
          key={`${item}-${col}-${i}`}
          className={`relative flex h-full flex-shrink-0 flex-row items-center border-b ${
            selected ? 'border-primary border-opacity-5' : 'border-gray-5'
          } ${columns[i]}`}
        >
          {itemComposition[i](item, selected)}
        </div>
      ))}
    </div>
  );
}
