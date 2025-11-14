import { Binoculars } from '@phosphor-icons/react';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';

const NotFoundState = (): JSX.Element => {
  const { translate } = useTranslationContext();

  return (
    <div className="flex h-full flex-col items-center justify-center space-y-4">
      <Binoculars weight="thin" className="text-gray-100" size={64} />
      <div className="flex flex-col items-center space-y-1">
        <p className="text-xl font-medium text-gray-100">{translate('general.searchBar.notFoundState.title')}</p>
        <p className="text-sm font-normal text-gray-60">{translate('general.searchBar.notFoundState.subtitle')}</p>
      </div>
    </div>
  );
};

export default NotFoundState;
