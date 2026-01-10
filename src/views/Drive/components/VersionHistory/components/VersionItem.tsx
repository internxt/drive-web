import { Info, DotsThree } from '@phosphor-icons/react';
import { Checkbox, Dropdown, Avatar } from '@internxt/ui';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import { useDropdownPositioning } from 'views/Drive/hooks/useDropdownPositioning';
import { useVersionItemActions } from 'views/Drive/hooks/useVersionItemActions';
import { formatVersionDate, getDaysUntilExpiration } from '../utils';
import { FileVersion } from '@internxt/sdk/dist/drive/storage/types';
import { memo } from 'react';
import sizeService from 'app/drive/services/size.service';

interface VersionItemProps {
  version: FileVersion;
  userName: string;
  userAvatar: string | null;
  isSelected: boolean;
  onSelectionChange: (selected: boolean) => void;
}

export const VersionItem = memo(
  ({ version, userName, userAvatar, isSelected, onSelectionChange }: VersionItemProps) => {
    const { translate } = useTranslationContext();
    const { isOpen, setIsOpen, dropdownPosition, dropdownRef, itemRef } = useDropdownPositioning();
    const { menuItems } = useVersionItemActions({
      version,
      onDropdownClose: () => setIsOpen(false),
    });

    const handleToggleSelection = () => {
      onSelectionChange(!isSelected);
    };

    const handleItemClick = () => {
      handleToggleSelection();
    };

    const dropdownOpenDirection = dropdownPosition === 'above' ? 'left' : 'right';
    const versionSize = sizeService.bytesToString(Number.parseInt(version.size), false);

    return (
      <>
        {isOpen && (
          <div
            className="fixed inset-0 z-40"
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(false);
            }}
            aria-hidden="true"
          />
        )}
        <button
          ref={itemRef as React.RefObject<HTMLButtonElement>}
          type="button"
          aria-pressed={isSelected}
          aria-label={`Version from ${formatVersionDate(version.createdAt)}`}
          className={`group relative w-full px-6 cursor-pointer text-left ${isSelected ? 'bg-primary/10' : 'hover:bg-gray-1'}`}
          onClick={handleItemClick}
        >
          <div className="flex min-w-0 flex-1 items-center justify-between border-b-[1px] border-[#ECECEC] dark:border-[#474747] py-3">
            <div className="flex min-w-0 flex-1 items-center space-x-3">
              <Checkbox
                checked={isSelected}
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleSelection();
                }}
                className={`h-4 w-4 shrink-0 transition-opacity ${
                  isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                }`}
              />
              <div className="flex min-w-0 flex-1 flex-col space-y-1">
                <div className="relative flex items-center pr-16">
                  <span className="text-base font-semibold text-gray-100">{formatVersionDate(version.updatedAt)}</span>
                  <span className="absolute right-[-32px] top-1/2 -translate-y-1/2 whitespace-nowrap text-base text-[#A6A6A6]">
                    {versionSize}
                  </span>
                </div>
                {version.expiresAt !== undefined && (
                  <div className="flex items-center space-x-1 text-[12px] text-red-dark">
                    <Info size={16} weight="regular" />
                    <span>
                      {translate('modals.versionHistory.expiresInDays', {
                        days: getDaysUntilExpiration(version.expiresAt),
                      })}
                    </span>
                  </div>
                )}
                <div className="flex items-center space-x-2 pt-1">
                  <Avatar src={userAvatar} fullName={userName} diameter={24} />
                  <span className="text-base text-gray-60 dark:text-gray-80">{userName}</span>
                </div>
              </div>
            </div>
            <div
              ref={dropdownRef}
              className={`relative shrink-0 transition-opacity ${isOpen ? 'opacity-100 z-50' : 'opacity-0 group-hover:opacity-100'}`}
            >
              <Dropdown
                classButton={`flex h-9 w-9 items-center justify-center rounded-full ${
                  isSelected ? 'hover:bg-primary/25' : 'hover:bg-gray-5'
                }`}
                classMenuItems={`z-50 right-0 flex flex-col rounded-lg bg-surface dark:bg-gray-5 border border-gray-10 shadow-subtle-hard min-w-[224px] ${
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
                    onSelectionChange(true);
                  }

                  return <DotsThree size={22} weight="bold" />;
                }}
              </Dropdown>
            </div>
          </div>
        </button>
      </>
    );
  },
);
