import {} from '@phosphor-icons/react';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import iconService from 'app/drive/services/icon.service';

const EmptyState = (): JSX.Element => {
  const { translate } = useTranslationContext();
  const PdfIcon = iconService.getItemIcon(false, 'pdf');
  const FolderIcon = iconService.getItemIcon(true);

  return (
    <div className="flex h-full flex-col items-center justify-center">
      <div className="relative h-20 w-28">
        <FolderIcon className="absolute left-11 top-0 h-16 w-16 rotate-10 drop-shadow-soft" />
        <PdfIcon className="absolute left-2 top-0 h-16 w-16 -rotate-10 drop-shadow-soft" />
      </div>
      <p className="text-xl font-medium text-gray-100">{translate('general.searchBar.emptyState.title')}</p>
      <p className="text-sm font-normal text-gray-60">{translate('general.searchBar.emptyState.subtitle')}</p>
    </div>
  );
};

export default EmptyState;
