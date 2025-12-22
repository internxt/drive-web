import { Trash } from '@phosphor-icons/react';
import { Checkbox } from '@internxt/ui';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';

interface AutosaveSectionProps {
  totalAutosaveCount: number;
  selectAllAutosave: boolean;
  onSelectAllChange: (checked: boolean) => void;
  onDeleteAll: () => void;
}

export const AutosaveSection = ({
  totalAutosaveCount,
  selectAllAutosave,
  onSelectAllChange,
  onDeleteAll,
}: AutosaveSectionProps) => {
  const { translate } = useTranslationContext();

  if (totalAutosaveCount === 0) return null;

  return (
    <div className="group flex items-center justify-between border-b-[2.5px] border-gray-5 px-6 py-5 hover:bg-gray-1 dark:hover:bg-gray-5">
      <div className="flex items-center space-x-3">
        <Checkbox
          checked={selectAllAutosave}
          onClick={() => onSelectAllChange(!selectAllAutosave)}
          className="h-4 w-4"
        />
        <span className="text-base text-gray-80">
          {translate('modals.versionHistory.autosaveVersions', {
            count: totalAutosaveCount,
            total: totalAutosaveCount,
          })}
        </span>
      </div>
      <button onClick={onDeleteAll} className="flex items-center justify-center">
        <Trash size={24} className="text-[#FF0D0080]" />
      </button>
    </div>
  );
};
