import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import { CheckIcon } from '@phosphor-icons/react';
import { ReactNode } from 'react';
import SearchFilterPill from 'views/Home/components/SearchFilterPill';

export interface PhotosFilterOption<T extends string> {
  id: T;
  label: string;
  icon?: ReactNode;
}

interface PhotosFilterMenuAction {
  label: string;
  icon: ReactNode;
  onClick: () => void;
}

interface PhotosFilterMenuProps<T extends string> {
  allLabel: string;
  options: PhotosFilterOption<T>[];
  selectedId: T | null;
  onSelect: (id: T | null) => void;
  action?: PhotosFilterMenuAction;
}

const PhotosFilterMenuRow = ({
  label,
  icon,
  isSelected,
  onClick,
}: {
  label: string;
  icon?: ReactNode;
  isSelected: boolean;
  onClick: () => void;
}) => (
  <MenuItem>
    <button
      type="button"
      aria-current={isSelected}
      onClick={onClick}
      className="flex w-full items-center gap-2 px-4 py-2 text-left text-gray-100 data-[focus]:bg-gray-5 dark:data-[focus]:bg-gray-10"
    >
      {icon}
      <span className="grow truncate">{label}</span>
      <CheckIcon size={16} className={isSelected ? 'shrink-0 text-primary' : 'invisible shrink-0'} />
    </button>
  </MenuItem>
);

/** Single choice filter shown as a pill, with an "all" option that clears it. */
const PhotosFilterMenu = <T extends string>({
  allLabel,
  options,
  selectedId,
  onSelect,
  action,
}: PhotosFilterMenuProps<T>): JSX.Element => {
  const selectedOption = options.find((option) => option.id === selectedId);

  return (
    <Menu as="div" className="relative min-w-0">
      <MenuButton as={SearchFilterPill} label={selectedOption?.label ?? allLabel} active={!!selectedOption} />
      <MenuItems
        transition
        modal={false}
        className="absolute right-0 z-20 mt-1 flex max-h-80 min-w-[240px] origin-top-right flex-col overflow-y-auto rounded-lg border border-gray-10 bg-surface py-1.5 shadow-subtle-hard outline-none transition duration-100 ease-out data-[closed]:scale-95 data-[closed]:opacity-0 dark:bg-gray-5"
      >
        <PhotosFilterMenuRow label={allLabel} isSelected={!selectedOption} onClick={() => onSelect(null)} />
        <div className="mx-4 my-1 border-t border-gray-10" />
        {options.map((option) => (
          <PhotosFilterMenuRow
            key={option.id}
            label={option.label}
            icon={option.icon}
            isSelected={option.id === selectedOption?.id}
            onClick={() => onSelect(option.id)}
          />
        ))}
        {action && (
          <>
            <div className="mx-4 my-1 border-t border-gray-10" />
            <PhotosFilterMenuRow label={action.label} icon={action.icon} isSelected={false} onClick={action.onClick} />
          </>
        )}
      </MenuItems>
    </Menu>
  );
};

export default PhotosFilterMenu;
