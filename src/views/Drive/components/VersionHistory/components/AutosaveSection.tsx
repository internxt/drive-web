import { Trash } from '@phosphor-icons/react';
import { Checkbox } from '@internxt/ui';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';

interface AutosaveSectionProps {
  totalVersionsCount: number;
  totalAllowedVersions: number;
  selectedCount: number;
  selectAllAutosave: boolean;
  onSelectAllChange: (checked: boolean) => void;
  onDeleteAll: () => void;
}

export const AutosaveSection = ({
  totalVersionsCount,
  totalAllowedVersions,
  selectedCount,
  selectAllAutosave,
  onSelectAllChange,
  onDeleteAll,
}: AutosaveSectionProps) => {
  const { translate } = useTranslationContext();
  const hasSelection = selectedCount > 0;
  const isIndeterminate = hasSelection && !selectAllAutosave;

  return (
    <div className="group flex items-center justify-between border-b-[1px] border-[#ECECEC] dark:border-[#474747] px-6 py-5 hover:bg-gray-1 dark:hover:bg-white/3">
      <div className="flex items-center space-x-3">
        <Checkbox
          checked={selectAllAutosave}
          indeterminate={isIndeterminate}
          onClick={() => onSelectAllChange(!selectAllAutosave)}
          className="h-4 w-4"
        />
        <span className="text-base text-gray-80">
          {translate('modals.versionHistory.autosaveVersions', {
            count: totalVersionsCount,
            total: totalAllowedVersions,
          })}
        </span>
      </div>
      <button
        onClick={onDeleteAll}
        disabled={!hasSelection}
        className={`flex h-10 w-10 items-center justify-center rounded-full transition-all ${
          hasSelection ? 'opacity-100 hover:bg-[#FFE5E5] dark:hover:bg-[#4D1A1A]' : 'opacity-50 cursor-not-allowed'
        }`}
      >
        <Trash size={24} className={hasSelection ? 'text-red' : 'text-[#FF0D0080]'} />
      </button>
    </div>
  );
};
