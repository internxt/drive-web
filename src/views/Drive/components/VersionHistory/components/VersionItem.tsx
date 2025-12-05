import { useState } from 'react';
import { Info, DotsThree } from '@phosphor-icons/react';
import { Checkbox, Dropdown, Avatar } from '@internxt/ui';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import { FileVersion } from '../types';
import { useDropdownPositioning, useVersionItemActions } from '../hooks';
import { formatVersionDate } from '../utils';

interface VersionItemProps {
  version: FileVersion;
  onDelete: (id: string) => void;
}

export const VersionItem = ({ version, onDelete }: VersionItemProps) => {
  const { translate } = useTranslationContext();
  const [isSelected, setIsSelected] = useState(true);
  const { isOpen, setIsOpen, dropdownPosition, dropdownRef, itemRef } = useDropdownPositioning();
  const { menuItems } = useVersionItemActions({
    version,
    onDelete,
    onDropdownClose: () => setIsOpen(false),
  });

  const handleItemClick = () => {
    setIsSelected(!isSelected);
  };

  const dropdownOpenDirection = dropdownPosition === 'above' ? 'left' : 'right';

  return (
    <button
      ref={itemRef as React.RefObject<HTMLButtonElement>}
      type="button"
      aria-pressed={isSelected}
      aria-label={`Version from ${formatVersionDate(version.date)}`}
      className={`group w-full px-6 cursor-pointer text-left ${isSelected ? 'bg-primary/10' : 'hover:bg-gray-1'}`}
      onClick={handleItemClick}
    >
      <div className="flex min-w-0 flex-1 items-center justify-between border-b-[2.5px] border-gray-5 py-3">
        <div className="flex min-w-0 flex-1 items-center space-x-3">
          <Checkbox
            checked={isSelected}
            onClick={() => setIsSelected(!isSelected)}
            className={`h-4 w-4 shrink-0 transition-opacity ${
              isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
            }`}
          />
          <div className="flex min-w-0 flex-1 flex-col space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-base font-semibold text-gray-100">{formatVersionDate(version.date)}</span>
            </div>
            {version.expiresInDays !== undefined && (
              <div className="flex items-center space-x-1 text-[12px] text-red-dark">
                <Info size={16} weight="regular" />
                <span>{translate('modals.versionHistory.expiresInDays', { days: version.expiresInDays })}</span>
              </div>
            )}
            <div className="flex items-center space-x-2 pt-1">
              <Avatar fullName={version.userName} diameter={24} />
              <span className="text-base text-gray-60 dark:text-gray-80">{version.userName}</span>
            </div>
          </div>
        </div>
        <div
          ref={dropdownRef}
          className={`shrink-0 transition-opacity ${isOpen ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
        >
          <Dropdown
            classButton={`flex h-9 w-9 items-center justify-center rounded-full ${
              isSelected ? 'hover:bg-primary/25' : 'hover:bg-gray-5'
            }`}
            classMenuItems={`z-20 right-0 flex flex-col rounded-lg bg-surface dark:bg-gray-5 border border-gray-10 shadow-subtle-hard min-w-[224px] ${
              dropdownPosition === 'above' ? 'bottom-0 mb-0' : 'mt-0'
            }`}
            openDirection={dropdownOpenDirection}
            item={version}
            dropdownActionsContext={menuItems}
          >
            {({ open }) => {
              const shouldUpdateOpen = open !== isOpen;
              const shouldCheckItem = open && !isSelected;

              if (shouldUpdateOpen) {
                setIsOpen(open);
              }

              if (shouldCheckItem) {
                setIsSelected(true);
              }

              return <DotsThree size={22} weight="bold" />;
            }}
          </Dropdown>
        </div>
      </div>
    </button>
  );
};
